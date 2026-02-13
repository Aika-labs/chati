import Stripe from 'stripe';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import { AppError } from '../../shared/middleware/error.handler.js';

const logger = createModuleLogger('billing');

// Initialize Stripe
const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY)
  : null;

// Plan configuration
const PLANS = {
  starter: {
    name: 'Starter',
    priceId: env.STRIPE_PRICE_STARTER || 'price_starter',
    plan: 'STARTER' as const,
    limits: {
      messagesPerDay: 250,
      contacts: 500,
      documents: 50,
      users: 1,
    },
  },
  pro: {
    name: 'Pro',
    priceId: env.STRIPE_PRICE_PRO || 'price_pro',
    plan: 'PRO' as const,
    limits: {
      messagesPerDay: 1000,
      contacts: 5000,
      documents: 200,
      users: 3,
    },
  },
};

export interface CheckoutSessionResult {
  checkoutUrl: string;
  sessionId: string;
}

export class BillingService {
  /**
   * Create a Stripe Checkout session for subscription
   */
  async createCheckoutSession(
    tenantId: string,
    planId: string
  ): Promise<CheckoutSessionResult> {
    if (!stripe) {
      throw new AppError(500, 'CONFIG_ERROR', 'Stripe not configured');
    }

    const plan = PLANS[planId as keyof typeof PLANS];
    if (!plan) {
      throw new AppError(400, 'INVALID_PLAN', 'Invalid plan selected');
    }

    // Get tenant info
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { users: { where: { role: 'OWNER' }, take: 1 } },
    });

    if (!tenant) {
      throw new AppError(404, 'TENANT_NOT_FOUND', 'Tenant not found');
    }

    const ownerEmail = tenant.users[0]?.email;

    // Create or get Stripe customer
    let customerId = tenant.stripeCustomerId ?? undefined;

    if (!customerId) {
      const customerParams: Stripe.CustomerCreateParams = {
        name: tenant.businessName || tenant.name,
        metadata: {
          tenantId: tenant.id,
        },
      };
      if (ownerEmail) {
        customerParams.email = ownerEmail;
      }
      const customer = await stripe.customers.create(customerParams);
      customerId = customer.id;

      // Save customer ID
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url: `${env.FRONTEND_URL}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/onboarding/plan`,
      metadata: {
        tenantId,
        planId,
      },
      subscription_data: {
        metadata: {
          tenantId,
          planId,
        },
      },
      allow_promotion_codes: true,
    });

    logger.info({ tenantId, planId, sessionId: session.id }, 'Checkout session created');

    return {
      checkoutUrl: session.url!,
      sessionId: session.id,
    };
  }

  /**
   * Verify checkout session and activate subscription
   */
  async verifyCheckoutSession(sessionId: string): Promise<void> {
    if (!stripe) {
      throw new AppError(500, 'CONFIG_ERROR', 'Stripe not configured');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.payment_status !== 'paid') {
      throw new AppError(400, 'PAYMENT_INCOMPLETE', 'Payment not completed');
    }

    const tenantId = session.metadata?.tenantId;
    const planId = session.metadata?.planId;

    if (!tenantId || !planId) {
      throw new AppError(400, 'INVALID_SESSION', 'Invalid session metadata');
    }

    const plan = PLANS[planId as keyof typeof PLANS];
    if (!plan) {
      throw new AppError(400, 'INVALID_PLAN', 'Invalid plan');
    }

    // Update tenant with subscription info
    const subscription = session.subscription as Stripe.Subscription;

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan: plan.plan,
        status: 'ACTIVE',
        stripeSubscriptionId: subscription.id,
        trialEndsAt: null,
      },
    });

    logger.info({ tenantId, planId, subscriptionId: subscription.id }, 'Subscription activated');
  }

  /**
   * Start free trial without payment
   */
  async startTrial(tenantId: string, planId: string): Promise<void> {
    const plan = PLANS[planId as keyof typeof PLANS];
    if (!plan) {
      throw new AppError(400, 'INVALID_PLAN', 'Invalid plan selected');
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 day trial

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan: plan.plan,
        status: 'TRIAL',
        trialEndsAt,
      },
    });

    logger.info({ tenantId, planId, trialEndsAt }, 'Trial started');
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionChange(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handlePaymentFailed(invoice);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handlePaymentSucceeded(invoice);
        break;
      }

      default:
        logger.debug({ type: event.type }, 'Unhandled Stripe webhook event');
    }
  }

  /**
   * Handle subscription status changes
   */
  private async handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
    const tenantId = subscription.metadata?.tenantId;
    if (!tenantId) {
      logger.warn({ subscriptionId: subscription.id }, 'Subscription without tenantId');
      return;
    }

    const status = subscription.status;
    let tenantStatus: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' = 'ACTIVE';

    if (status === 'canceled' || status === 'unpaid') {
      tenantStatus = 'SUSPENDED';
    } else if (status === 'trialing') {
      tenantStatus = 'TRIAL';
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { status: tenantStatus },
    });

    logger.info({ tenantId, status: tenantStatus }, 'Subscription status updated');
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;

    const tenant = await prisma.tenant.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (tenant) {
      logger.warn({ tenantId: tenant.id, invoiceId: invoice.id }, 'Payment failed');
      // Could send notification email here
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;

    const tenant = await prisma.tenant.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (tenant) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { status: 'ACTIVE' },
      });

      logger.info({ tenantId: tenant.id, invoiceId: invoice.id }, 'Payment succeeded');
    }
  }

  /**
   * Create customer portal session for managing subscription
   */
  async createPortalSession(tenantId: string): Promise<string> {
    if (!stripe) {
      throw new AppError(500, 'CONFIG_ERROR', 'Stripe not configured');
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant?.stripeCustomerId) {
      throw new AppError(400, 'NO_SUBSCRIPTION', 'No active subscription found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${env.FRONTEND_URL}/dashboard/settings`,
    });

    return session.url;
  }
}

export const billingService = new BillingService();
