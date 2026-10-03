import { VaultItem } from '../types';

export const INITIAL_SAMPLE_ITEMS: VaultItem[] = [
  {
    id: 'sample-login-1',
    category: 'login',
    title: 'Personal Email & Cloud Workspace',
    username: 'user@personal-domain.me',
    password: 'vK9#xP$92!mR8*qL4',
    url: 'https://mail.personal-domain.me',
    totpSecret: 'JBSWY3DPEHPK3PXP', // Sample standard Base32 secret for live TOTP demo
    favorite: true,
    tags: ['Work', 'Email'],
    createdAt: Date.now() - 86400000 * 12,
    updatedAt: Date.now() - 86400000 * 2,
    notes: 'Primary personal and financial communications account. 2FA TOTP authenticator enabled locally with zero cloud transmission.',
    customFields: [
      { id: 'cf-1', label: 'Recovery Email', value: 'backup.vault@provider.com', isMasked: false },
      { id: 'cf-2', label: 'Security PIN', value: '883192', isMasked: true }
    ]
  },
  {
    id: 'sample-doc-1',
    category: 'document',
    title: 'International Passport & Travel Visa',
    docType: 'passport',
    docNumber: 'P89218402X',
    issuer: 'Passport Agency / Department of State',
    issueDate: '2022-04-15',
    expiryDate: '2032-04-14',
    favorite: true,
    tags: ['Travel', 'Official'],
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now() - 86400000 * 10,
    notes: 'Official biometric travel document with ten-year validity. Keep safe during international transit.',
    attachments: [
      {
        id: 'att-1',
        name: 'passport_identification_page_scan.pdf',
        size: 148200,
        type: 'application/pdf',
        dataUrl: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAzIDAgUgovQ29udGVudHMgNSAwIFIKL1Jlc291cmNlcyA8PAovRm9udCA8PAovRjEgNiAwIFIKPj4KPj4KPj4KZW5kb2JqCg==',
        uploadedAt: Date.now() - 86400000 * 20
      }
    ]
  },
  {
    id: 'sample-card-1',
    category: 'card',
    title: 'Primary Sapphire Reserve Rewards',
    cardholderName: 'ALEXANDER M VANCE',
    cardNumber: '4111222233334444',
    cardType: 'visa',
    expiryMonth: '08',
    expiryYear: '2028',
    cvv: '829',
    pin: '4920',
    billingAddress: '742 Evergreen Terrace, Springfield, OR 97477',
    bank: 'First National Bank',
    favorite: false,
    tags: ['Finance', 'Everyday'],
    createdAt: Date.now() - 86400000 * 45,
    updatedAt: Date.now() - 86400000 * 15,
    notes: 'Zero international foreign transaction fees. Contact concierge via reverse phone if traveling abroad.'
  },
  {
    id: 'sample-identity-1',
    category: 'identity',
    title: 'State Driver License & Real ID',
    fullName: 'Alexander Marcus Vance',
    idType: "Driver's License (Class C)",
    idNumber: 'D901847192',
    dateOfBirth: '1992-11-04',
    nationality: 'United States',
    expiryDate: '2027-11-04',
    taxNumber: 'XXX-XX-8491',
    emergencyContact: 'Sarah Vance (+1 555-019-8234)',
    favorite: true,
    tags: ['Identity', 'ID'],
    createdAt: Date.now() - 86400000 * 60,
    updatedAt: Date.now() - 86400000 * 5,
    notes: 'Organ donor registered. Real ID star compliant for domestic flights.',
    attachments: []
  },
  {
    id: 'sample-note-1',
    category: 'note',
    title: 'Home WiFi & Cold Storage Hardware Seed Phrase',
    content: '### Home Router Credentials\n- **SSID (5GHz)**: `Fortress_HyperNet_5G`\n- **WPA3 Passphrase**: `Solar-Nebula-Falcon-77#`\n- **Admin Gateway**: `https://192.168.1.1` (User: `admin`)\n\n---\n\n### Hardware Wallet Cold Storage Seed (24 words)\n`timber beacon haven ripple granite lotus meadow quartz summit breeze solar zenith ...`\n*(Stored encrypted locally using your personal master key AES-GCM 256. Zero cloud telemetry).*',
    folder: 'Security & Infrastructure',
    favorite: true,
    tags: ['Hardware', 'WiFi', 'Critical'],
    createdAt: Date.now() - 86400000 * 75,
    updatedAt: Date.now() - 86400000 * 3,
    notes: 'Never paste seed phrases into web browsers on public networks.'
  }
];
