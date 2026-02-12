import * as pulumi from "@pulumi/pulumi";
import * as hcloud from "@pulumi/hcloud";
import * as command from "@pulumi/command";

// Configuration
const config = new pulumi.Config();
const domain = config.require("domain");
const sshPublicKey = config.require("sshPublicKey");
const acmeEmail = config.require("acmeEmail");

// Hetzner config
const hcloudConfig = new pulumi.Config("hcloud");
const serverType = config.get("serverType") || "cpx31"; // 4 vCPU, 8GB RAM
const location = config.get("location") || "nbg1"; // Nuremberg, Germany

// SSH Key
const sshKey = new hcloud.SshKey("chati-ssh-key", {
    name: "chati-deploy-key",
    publicKey: sshPublicKey,
});

// Firewall
const firewall = new hcloud.Firewall("chati-firewall", {
    name: "chati-firewall",
    rules: [
        // SSH
        {
            direction: "in",
            protocol: "tcp",
            port: "22",
            sourceIps: ["0.0.0.0/0", "::/0"],
            description: "SSH access",
        },
        // HTTP
        {
            direction: "in",
            protocol: "tcp",
            port: "80",
            sourceIps: ["0.0.0.0/0", "::/0"],
            description: "HTTP (redirect to HTTPS)",
        },
        // HTTPS
        {
            direction: "in",
            protocol: "tcp",
            port: "443",
            sourceIps: ["0.0.0.0/0", "::/0"],
            description: "HTTPS",
        },
        // ICMP (ping)
        {
            direction: "in",
            protocol: "icmp",
            sourceIps: ["0.0.0.0/0", "::/0"],
            description: "Ping",
        },
    ],
    labels: {
        app: "chati",
        environment: pulumi.getStack(),
    },
});

// Cloud-init user data for server setup
const cloudInit = pulumi.interpolate`#cloud-config
package_update: true
package_upgrade: true

packages:
  - docker.io
  - docker-compose
  - git
  - curl
  - htop
  - fail2ban

users:
  - name: deploy
    groups: docker, sudo
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ${sshPublicKey}

write_files:
  - path: /etc/docker/daemon.json
    content: |
      {
        "log-driver": "json-file",
        "log-opts": {
          "max-size": "10m",
          "max-file": "3"
        }
      }

  - path: /home/deploy/.env.production
    permissions: '0600'
    content: |
      DOMAIN=${domain}
      ACME_EMAIL=${acmeEmail}
      NODE_ENV=production

runcmd:
  # Enable and start Docker
  - systemctl enable docker
  - systemctl start docker
  
  # Configure fail2ban
  - systemctl enable fail2ban
  - systemctl start fail2ban
  
  # Create app directory
  - mkdir -p /opt/chati
  - chown -R deploy:deploy /opt/chati
  
  # Set up automatic security updates
  - apt-get install -y unattended-upgrades
  - dpkg-reconfigure -plow unattended-upgrades
  
  # Configure swap (2GB)
  - fallocate -l 2G /swapfile
  - chmod 600 /swapfile
  - mkswap /swapfile
  - swapon /swapfile
  - echo '/swapfile none swap sw 0 0' >> /etc/fstab
  
  # Optimize sysctl for production
  - |
    cat >> /etc/sysctl.conf << EOF
    # Network optimizations
    net.core.somaxconn = 65535
    net.ipv4.tcp_max_syn_backlog = 65535
    net.ipv4.ip_local_port_range = 1024 65535
    net.ipv4.tcp_tw_reuse = 1
    
    # Memory optimizations
    vm.swappiness = 10
    vm.overcommit_memory = 1
    EOF
  - sysctl -p
`;

// Main VPS Server
const server = new hcloud.Server("chati-server", {
    name: `chati-${pulumi.getStack()}`,
    serverType: serverType,
    image: "ubuntu-24.04",
    location: location,
    sshKeys: [sshKey.id],
    firewallIds: [firewall.id.apply(id => parseInt(id))],
    userData: cloudInit,
    labels: {
        app: "chati",
        environment: pulumi.getStack(),
    },
    publicNets: [{
        ipv4Enabled: true,
        ipv6Enabled: true,
    }],
});

// Wait for server to be ready and run initial setup
const setupCommand = new command.remote.Command("setup-docker", {
    connection: {
        host: server.ipv4Address,
        user: "deploy",
        privateKey: config.requireSecret("sshPrivateKey"),
    },
    create: pulumi.interpolate`
        # Wait for cloud-init to complete
        cloud-init status --wait
        
        # Verify Docker is running
        docker --version
        docker-compose --version
        
        # Create directory structure
        mkdir -p /opt/chati/{data,logs,backups}
        
        echo "Server setup complete!"
    `,
}, { dependsOn: [server] });

// Outputs
export const serverIp = server.ipv4Address;
export const serverIpv6 = server.ipv6Address;
export const serverStatus = server.status;
export const serverId = server.id;
export const serverName = server.name;

// DNS instructions
export const dnsInstructions = pulumi.interpolate`
Configure your DNS records:
  A    ${domain}        -> ${server.ipv4Address}
  A    api.${domain}    -> ${server.ipv4Address}
  AAAA ${domain}        -> ${server.ipv6Address}
  AAAA api.${domain}    -> ${server.ipv6Address}
`;

// SSH connection string
export const sshCommand = pulumi.interpolate`ssh deploy@${server.ipv4Address}`;

// Deployment instructions
export const deployInstructions = pulumi.interpolate`
To deploy Chati:
1. SSH into the server: ssh deploy@${server.ipv4Address}
2. Clone the repository: git clone https://github.com/Aika-labs/chati.git /opt/chati/app
3. Copy environment file: cp /home/deploy/.env.production /opt/chati/app/.env
4. Add your secrets to .env (DATABASE_URL, GROQ_API_KEY, etc.)
5. Start the application: cd /opt/chati/app && docker-compose up -d
`;
