import { StoredEncryptedVault, VaultMetadata, VaultItem } from '../types';

const DB_NAME = 'PersonalVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'encrypted_vault_store';
const RECORD_KEY = 'current_vault';

/**
 * Initializes and gets the IndexedDB instance
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
    };
  });
}

/**
 * Saves the encrypted vault record to IndexedDB
 */
export async function saveEncryptedVaultToStorage(vault: StoredEncryptedVault): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(vault, RECORD_KEY);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error(`Failed to save vault: ${req.error?.message}`));
  });
}

/**
 * Loads the encrypted vault record from IndexedDB
 */
export async function loadEncryptedVaultFromStorage(): Promise<StoredEncryptedVault | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(RECORD_KEY);

      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => reject(new Error(`Failed to load vault: ${req.error?.message}`));
    });
  } catch {
    return null;
  }
}

/**
 * Deletes all stored vault data from IndexedDB
 */
export async function deleteEncryptedVaultFromStorage(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(RECORD_KEY);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error(`Failed to delete vault: ${req.error?.message}`));
  });
}

/**
 * Exports the encrypted vault as a downloadable .vault JSON file
 */
export function exportVaultBackupFile(vault: StoredEncryptedVault): void {
  const exportPayload = {
    appName: 'Personal Credential & Document Vault',
    version: 1,
    exportedAt: new Date().toISOString(),
    format: 'AES-256-GCM-PBKDF2',
    meta: vault.meta,
    ciphertext: vault.ciphertext,
    iv: vault.iv,
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `personal-vault-backup-${dateStr}.vault`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validates and parses an imported .vault backup file
 */
export function parseImportedVaultFile(content: string): StoredEncryptedVault {
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Invalid backup file: Not valid JSON format.');
  }

  if (!parsed || !parsed.meta || !parsed.ciphertext || !parsed.iv) {
    throw new Error('Invalid backup format: Missing required cryptographic fields (meta, ciphertext, iv).');
  }

  const meta: VaultMetadata = parsed.meta;
  if (!meta.salt || !meta.verifier || !meta.verifierIv) {
    throw new Error('Invalid backup file: Corrupt cryptographic metadata.');
  }

  return {
    meta,
    ciphertext: parsed.ciphertext,
    iv: parsed.iv,
  };
}

/**
 * Downloads an arbitrary Blob as a file in the browser
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports decrypted vault items in RFC 4180 compliant CSV format with UTF-8 BOM
 * Compatible with Microsoft Excel, Apple Numbers, Google Sheets, Bitwarden, 1Password
 */
export function exportVaultToCSV(items: VaultItem[], filenamePrefix = 'personal-vault-export'): void {
  const headers = [
    'ID',
    'Category',
    'Title',
    'Username',
    'Password / Credential',
    'URL / Website',
    'Expiry Date',
    'TOTP Secret',
    'Cardholder Name',
    'Card Number',
    'Card Expiry',
    'Card CVV',
    'Doc Type',
    'Doc Number',
    'Full Name',
    'ID / Tax Number',
    'Favorite',
    'Tags',
    'Notes',
    'Created At',
    'Updated At',
    'Custom Fields & Extended Details'
  ];

  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = items.map((item) => {
    const isLogin = item.category === 'login';
    const isCard = item.category === 'card';
    const isDoc = item.category === 'document';
    const isId = item.category === 'identity';
    const isNote = item.category === 'note';

    const username = isLogin ? (item as any).username || '' : '';
    const password = isLogin ? (item as any).password || '' : isNote ? (item as any).content || '' : '';
    const url = isLogin ? (item as any).url || '' : '';
    const totpSecret = isLogin ? (item as any).totpSecret || '' : '';

    const cardholder = isCard ? (item as any).cardholderName || '' : '';
    const cardNumber = isCard ? (item as any).cardNumber || '' : '';
    const cardExpiry = isCard && (item as any).expiryYear ? `${(item as any).expiryMonth || '01'}/${(item as any).expiryYear}` : '';
    const cardCvv = isCard ? (item as any).cvv || '' : '';

    const docType = isDoc ? (item as any).docType || '' : '';
    const docNumber = isDoc ? (item as any).docNumber || '' : '';

    const fullName = isId ? (item as any).fullName || '' : '';
    const idNumber = isId ? (item as any).idNumber || (item as any).taxNumber || '' : '';

    const expiryDate = item.expiresAt || (item as any).expiryDate || cardExpiry || '';

    // Extra details / custom fields
    const extraDetails: string[] = [];
    if (isDoc) {
      if ((item as any).issuer) extraDetails.push(`Issuer: ${(item as any).issuer}`);
      if ((item as any).issueDate) extraDetails.push(`Issued: ${(item as any).issueDate}`);
      if ((item as any).attachments?.length) extraDetails.push(`Attachments: ${(item as any).attachments.length} files`);
    }
    if (isId) {
      if ((item as any).nationality) extraDetails.push(`Nationality: ${(item as any).nationality}`);
      if ((item as any).emergencyContact) extraDetails.push(`Emergency: ${(item as any).emergencyContact}`);
    }
    if (item.customFields && item.customFields.length > 0) {
      item.customFields.forEach((cf) => {
        extraDetails.push(`${cf.label}: ${cf.value}`);
      });
    }

    return [
      escapeCSV(item.id),
      escapeCSV(item.category),
      escapeCSV(item.title),
      escapeCSV(username),
      escapeCSV(password),
      escapeCSV(url),
      escapeCSV(expiryDate),
      escapeCSV(totpSecret),
      escapeCSV(cardholder),
      escapeCSV(cardNumber),
      escapeCSV(cardExpiry),
      escapeCSV(cardCvv),
      escapeCSV(docType),
      escapeCSV(docNumber),
      escapeCSV(fullName),
      escapeCSV(idNumber),
      escapeCSV(item.favorite ? 'Yes' : 'No'),
      escapeCSV(item.tags?.join(', ') || ''),
      escapeCSV(item.notes || ''),
      escapeCSV(item.createdAt ? new Date(item.createdAt).toISOString() : ''),
      escapeCSV(item.updatedAt ? new Date(item.updatedAt).toISOString() : ''),
      escapeCSV(extraDetails.join(' | '))
    ].join(',');
  });

  // UTF-8 BOM (\uFEFF) ensures Excel opens without character encoding issues
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const dateStr = new Date().toISOString().split('T')[0];
  downloadBlob(blob, `${filenamePrefix}-${dateStr}.csv`);
}

/**
 * Exports decrypted vault items in Microsoft Excel XML Spreadsheet format (.xls)
 * Opens directly in Microsoft Excel, Apple Numbers, Google Sheets, and LibreOffice Calc
 * with formatted header styling, custom column widths, and gridlines.
 */
export function exportVaultToExcel(items: VaultItem[], filenamePrefix = 'personal-vault-export'): void {
  const escapeXml = (str: any): string => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const columns = [
    { title: 'ID', width: 140 },
    { title: 'Category', width: 90 },
    { title: 'Title', width: 180 },
    { title: 'Username', width: 150 },
    { title: 'Password / Secret', width: 180 },
    { title: 'URL / Website', width: 200 },
    { title: 'Expiry Date', width: 100 },
    { title: 'TOTP Secret', width: 140 },
    { title: 'Cardholder', width: 140 },
    { title: 'Card Number', width: 150 },
    { title: 'Card Expiry', width: 90 },
    { title: 'CVV', width: 60 },
    { title: 'Doc Type', width: 110 },
    { title: 'Doc Number', width: 130 },
    { title: 'Full Name', width: 150 },
    { title: 'ID / Tax Number', width: 130 },
    { title: 'Favorite', width: 70 },
    { title: 'Tags', width: 120 },
    { title: 'Notes', width: 220 },
    { title: 'Created At', width: 140 },
    { title: 'Updated At', width: 140 },
    { title: 'Extended Details & Custom Fields', width: 250 },
  ];

  let xmlRows = '';

  // Header Row
  xmlRows += '<Row ss:StyleID="HeaderStyle">\n';
  columns.forEach((col) => {
    xmlRows += `  <Cell><Data ss:Type="String">${escapeXml(col.title)}</Data></Cell>\n`;
  });
  xmlRows += '</Row>\n';

  // Data Rows
  items.forEach((item, index) => {
    const isLogin = item.category === 'login';
    const isCard = item.category === 'card';
    const isDoc = item.category === 'document';
    const isId = item.category === 'identity';
    const isNote = item.category === 'note';

    const username = isLogin ? (item as any).username || '' : '';
    const password = isLogin ? (item as any).password || '' : isNote ? (item as any).content || '' : '';
    const url = isLogin ? (item as any).url || '' : '';
    const totpSecret = isLogin ? (item as any).totpSecret || '' : '';

    const cardholder = isCard ? (item as any).cardholderName || '' : '';
    const cardNumber = isCard ? (item as any).cardNumber || '' : '';
    const cardExpiry = isCard && (item as any).expiryYear ? `${(item as any).expiryMonth || '01'}/${(item as any).expiryYear}` : '';
    const cardCvv = isCard ? (item as any).cvv || '' : '';

    const docType = isDoc ? (item as any).docType || '' : '';
    const docNumber = isDoc ? (item as any).docNumber || '' : '';

    const fullName = isId ? (item as any).fullName || '' : '';
    const idNumber = isId ? (item as any).idNumber || (item as any).taxNumber || '' : '';

    const expiryDate = item.expiresAt || (item as any).expiryDate || cardExpiry || '';

    const extraDetails: string[] = [];
    if (isDoc) {
      if ((item as any).issuer) extraDetails.push(`Issuer: ${(item as any).issuer}`);
      if ((item as any).issueDate) extraDetails.push(`Issued: ${(item as any).issueDate}`);
      if ((item as any).attachments?.length) extraDetails.push(`Attachments: ${(item as any).attachments.length} files`);
    }
    if (isId) {
      if ((item as any).nationality) extraDetails.push(`Nationality: ${(item as any).nationality}`);
      if ((item as any).emergencyContact) extraDetails.push(`Emergency: ${(item as any).emergencyContact}`);
    }
    if (item.customFields && item.customFields.length > 0) {
      item.customFields.forEach((cf) => {
        extraDetails.push(`${cf.label}: ${cf.value}`);
      });
    }

    const rowStyle = index % 2 === 0 ? 'RowEven' : 'RowOdd';

    xmlRows += `<Row ss:StyleID="${rowStyle}">\n`;
    const values = [
      item.id,
      item.category,
      item.title,
      username,
      password,
      url,
      expiryDate,
      totpSecret,
      cardholder,
      cardNumber,
      cardExpiry,
      cardCvv,
      docType,
      docNumber,
      fullName,
      idNumber,
      item.favorite ? 'Yes' : 'No',
      item.tags?.join(', ') || '',
      item.notes || '',
      item.createdAt ? new Date(item.createdAt).toLocaleString() : '',
      item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '',
      extraDetails.join(' | ')
    ];

    values.forEach((v) => {
      xmlRows += `  <Cell><Data ss:Type="String">${escapeXml(v)}</Data></Cell>\n`;
    });
    xmlRows += '</Row>\n';
  });

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>Personal Vault Export</Title>
  <Author>Personal Credential &amp; Document Vault</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0E7490"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="RowEven">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Color="#0F172A"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="RowOdd">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Color="#0F172A"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Vault Credentials">
  <Table ss:DefaultRowHeight="20">
${columns.map((c) => `   <Column ss:AutoFitWidth="0" ss:Width="${c.width}"/>`).join('\n')}
${xmlRows}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <Selected/>
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>1</SplitHorizontal>
   <TopRowBottomPane>1</TopRowBottomPane>
   <ActivePane>2</ActivePane>
   <Panes>
    <Pane>
     <Number>3</Number>
    </Pane>
    <Pane>
     <Number>2</Number>
    </Pane>
   </Panes>
   <ProtectObjects>False</ProtectObjects>
   <ProtectScenarios>False</ProtectScenarios>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const dateStr = new Date().toISOString().split('T')[0];
  downloadBlob(blob, `${filenamePrefix}-${dateStr}.xls`);
}
