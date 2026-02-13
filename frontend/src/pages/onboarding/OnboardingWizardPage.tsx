import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Brain,
  FileText,
  Rocket,
  Check,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { cn } from '../../lib/utils';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const steps: Step[] = [
  {
    id: 'whatsapp',
    title: 'Conectar WhatsApp',
    description: 'Vincula tu numero de WhatsApp Business',
    icon: Smartphone,
  },
  {
    id: 'ai',
    title: 'Configurar IA',
    description: 'Personaliza las respuestas automaticas',
    icon: Brain,
  },
  {
    id: 'knowledge',
    title: 'Base de Conocimiento',
    description: 'Sube documentos para entrenar la IA',
    icon: FileText,
  },
  {
    id: 'test',
    title: 'Probar Bot',
    description: 'Verifica que todo funcione correctamente',
    icon: Rocket,
  },
];

export function OnboardingWizardPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Form states
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [aiTone, setAiTone] = useState<'formal' | 'friendly' | 'professional'>('friendly');
  const [aiGreeting, setAiGreeting] = useState('Hola! Gracias por contactarnos. ¿En que puedo ayudarte?');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleNext = () => {
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Mark onboarding as complete and redirect to dashboard
    navigate('/dashboard');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles([...uploadedFiles, ...Array.from(e.target.files)]);
    }
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'whatsapp':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Conecta tu WhatsApp Business
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Necesitamos vincular tu numero para enviar y recibir mensajes
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre del negocio
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Mi Negocio"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Numero de WhatsApp Business
                </label>
                <input
                  type="tel"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="+52 55 1234 5678"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Incluye el codigo de pais (ej: +52 para Mexico)
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Nota:</strong> Necesitaras acceso a la API de WhatsApp Business.
                  Si aun no la tienes, podemos ayudarte a configurarla.
                </p>
              </div>
            </div>
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-10 h-10 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Configura tu Asistente IA
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Personaliza como responde la IA a tus clientes
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Tono de comunicacion
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'formal', label: 'Formal', desc: 'Usted, profesional' },
                    { id: 'friendly', label: 'Amigable', desc: 'Tu, cercano' },
                    { id: 'professional', label: 'Profesional', desc: 'Equilibrado' },
                  ].map((tone) => (
                    <button
                      key={tone.id}
                      onClick={() => setAiTone(tone.id as typeof aiTone)}
                      className={cn(
                        'p-4 rounded-xl border-2 text-left transition-all',
                        aiTone === tone.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      )}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{tone.label}</div>
                      <div className="text-sm text-gray-500">{tone.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mensaje de bienvenida
                </label>
                <textarea
                  value={aiGreeting}
                  onChange={(e) => setAiGreeting(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none"
                />
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vista previa:
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm">
                  <p className="text-gray-800 dark:text-gray-200">{aiGreeting}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'knowledge':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Base de Conocimiento
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Sube documentos para que la IA aprenda sobre tu negocio
              </p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-primary-500 transition-colors cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Arrastra archivos aqui o haz clic para seleccionar
                  </p>
                  <p className="text-sm text-gray-500">
                    PDF, Excel, Word, TXT (max 10MB)
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.xlsx,.xls,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </label>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Archivos subidos:
                  </div>
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {file.name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  <strong>Tip:</strong> Sube tu lista de precios, menu, catalogo de servicios,
                  o cualquier documento que ayude a la IA a responder preguntas frecuentes.
                </p>
              </div>
            </div>
          </div>
        );

      case 'test':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Todo Listo!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Tu asistente esta configurado y listo para atender clientes
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Resumen de configuracion:
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700 dark:text-gray-300">
                      WhatsApp: {whatsappPhone || 'No configurado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Tono: {aiTone === 'formal' ? 'Formal' : aiTone === 'friendly' ? 'Amigable' : 'Profesional'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Documentos: {uploadedFiles.length} archivos
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-6 text-center">
                <p className="text-primary-700 dark:text-primary-300 mb-4">
                  Puedes probar tu bot en el simulador del dashboard
                </p>
                <Button onClick={handleComplete} size="lg">
                  Ir al Dashboard
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors',
                    index < currentStep || completedSteps.has(index)
                      ? 'bg-primary-600 text-white'
                      : index === currentStep
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 ring-2 ring-primary-600'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  )}
                >
                  {completedSteps.has(index) ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'w-full h-1 mx-2',
                      index < currentStep
                        ? 'bg-primary-600'
                        : 'bg-gray-200 dark:bg-gray-700'
                    )}
                    style={{ width: '60px' }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Paso {currentStep + 1} de {steps.length}: {steps[currentStep].title}
            </span>
          </div>
        </div>

        {/* Content */}
        <Card className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          {currentStep < steps.length - 1 && (
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={handlePrev}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                Anterior
              </Button>
              <Button onClick={handleNext}>
                Siguiente
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}
        </Card>

        {/* Skip option */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Saltar configuracion y continuar al dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
