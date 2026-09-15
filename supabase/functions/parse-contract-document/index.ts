// Parse contract documents (PDF, DOCX, TXT) and extract editable fields

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhum arquivo enviado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileName = file.name.toLowerCase();
    let extractedText = '';
    
    console.log(`Processing file: ${fileName}, type: ${file.type}, size: ${file.size}`);

    if (fileName.endsWith('.txt')) {
      // Plain text - read directly
      extractedText = await file.text();
    } else if (fileName.endsWith('.docx')) {
      // DOCX - extract text from XML structure
      extractedText = await extractDocxText(file);
    } else if (fileName.endsWith('.pdf')) {
      // PDF - extract text using basic parsing
      extractedText = await extractPdfText(file);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Formato não suportado. Use PDF, DOCX ou TXT.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detect fields with pattern {{FIELD_NAME}}
    const fields = detectFields(extractedText);
    
    console.log(`Extracted ${extractedText.length} characters, found ${fields.length} fields`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        content: extractedText,
        fields,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error parsing document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao processar documento';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // DOCX is a ZIP file - find document.xml content
  // Look for the document.xml file in the ZIP structure
  const textParts: string[] = [];
  
  // Simple approach: look for text between XML tags
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const content = decoder.decode(uint8Array);
  
  // Find the document.xml content (it's compressed, but we can try to find readable parts)
  // For DOCX, we'll use a more robust approach - decompress the ZIP
  
  try {
    // Try to find readable XML content in the DOCX
    // DOCX stores text in <w:t> tags within document.xml
    
    // Look for PK signature (ZIP file)
    if (uint8Array[0] === 0x50 && uint8Array[1] === 0x4B) {
      // It's a valid ZIP/DOCX file
      // We need to extract document.xml from the ZIP
      
      // Simple ZIP parsing - find local file headers
      let offset = 0;
      const files: { name: string; compressedData: Uint8Array; compressionMethod: number }[] = [];
      
      while (offset < uint8Array.length - 30) {
        // Local file header signature: 0x04034b50
        if (uint8Array[offset] === 0x50 && uint8Array[offset + 1] === 0x4B &&
            uint8Array[offset + 2] === 0x03 && uint8Array[offset + 3] === 0x04) {
          
          const compressionMethod = uint8Array[offset + 8] | (uint8Array[offset + 9] << 8);
          const compressedSize = uint8Array[offset + 18] | (uint8Array[offset + 19] << 8) | 
                                 (uint8Array[offset + 20] << 16) | (uint8Array[offset + 21] << 24);
          const fileNameLength = uint8Array[offset + 26] | (uint8Array[offset + 27] << 8);
          const extraFieldLength = uint8Array[offset + 28] | (uint8Array[offset + 29] << 8);
          
          const fileNameBytes = uint8Array.slice(offset + 30, offset + 30 + fileNameLength);
          const fileName = decoder.decode(fileNameBytes);
          
          const dataStart = offset + 30 + fileNameLength + extraFieldLength;
          const compressedData = uint8Array.slice(dataStart, dataStart + compressedSize);
          
          if (fileName === 'word/document.xml' || fileName.includes('document.xml')) {
            files.push({ name: fileName, compressedData, compressionMethod });
          }
          
          offset = dataStart + compressedSize;
        } else {
          offset++;
        }
      }
      
      // Process document.xml
      for (const f of files) {
        let xmlContent: string;
        
        if (f.compressionMethod === 0) {
          // Stored (no compression)
          xmlContent = decoder.decode(f.compressedData);
        } else if (f.compressionMethod === 8) {
          // Deflate compression - use DecompressionStream
          try {
            const stream = new DecompressionStream('deflate-raw');
            const writer = stream.writable.getWriter();
            writer.write(new Uint8Array(f.compressedData));
            writer.close();
            
            const reader = stream.readable.getReader();
            const chunks: Uint8Array[] = [];
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
            }
            
            const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const result = new Uint8Array(totalLength);
            let position = 0;
            for (const chunk of chunks) {
              result.set(chunk, position);
              position += chunk.length;
            }
            
            xmlContent = decoder.decode(result);
          } catch (e) {
            console.error('Decompression failed:', e);
            continue;
          }
        } else {
          continue;
        }
        
        // Extract text from <w:t> tags
        const textMatches = xmlContent.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g);
        for (const match of textMatches) {
          textParts.push(match[1]);
        }
      }
    }
  } catch (e) {
    console.error('DOCX parsing error:', e);
  }
  
  if (textParts.length === 0) {
    // Fallback: try to find any readable text with {{}} patterns
    const fallbackMatch = content.match(/\{\{[A-Z_]+\}\}/g);
    if (fallbackMatch) {
      return `Campos detectados no documento:\n${fallbackMatch.join('\n')}`;
    }
    throw new Error('Não foi possível extrair texto do DOCX. Tente usar o formato TXT ou cole o conteúdo manualmente.');
  }
  
  return textParts.join(' ');
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  const textParts: string[] = [];
  const foundFields: string[] = [];
  
  // Try multiple encodings
  const encodings = ['latin1', 'utf-8', 'utf-16be', 'utf-16le'];
  
  for (const encoding of encodings) {
    try {
      const decoder = new TextDecoder(encoding, { fatal: false });
      const content = decoder.decode(uint8Array);
      
      // Look for field patterns with various formats
      const patterns = [
        /\{\{([A-Z][A-Z0-9_]*)\}\}/gi,
        /\{ \{ ?([A-Z][A-Z0-9_ ]*) ?\} \}/gi,
        /\[\[([A-Z][A-Z0-9_]*)\]\]/gi,
        /<<([A-Z][A-Z0-9_]*)>>/gi,
        /__([A-Z][A-Z0-9_]*)__/gi,
      ];
      
      for (const pattern of patterns) {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          const fieldName = match[1].replace(/\s+/g, '_').toUpperCase();
          const field = `{{${fieldName}}}`;
          if (!foundFields.includes(field) && fieldName.length >= 2) {
            foundFields.push(field);
          }
        }
      }
    } catch (e) {
      // Continue with other encodings
    }
  }
  
  // Extract text from PDF streams
  const decoder = new TextDecoder('latin1');
  const content = decoder.decode(uint8Array);
  
  // Method 1: Find text in streams
  const streamMatches = content.matchAll(/stream\s*([\s\S]*?)\s*endstream/g);
  for (const match of streamMatches) {
    const streamContent = match[1];
    
    // Try to decompress if it's a FlateDecode stream
    // For now, look for readable content
    
    // Find text within parentheses (PDF string literals)
    const textInParens = streamContent.matchAll(/\(([^)]{2,})\)/g);
    for (const textMatch of textInParens) {
      let text = textMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
        // Handle octal escapes
        .replace(/\\([0-7]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
      
      if (text.trim() && /[a-zA-Z{}\[\]<>_]/.test(text)) {
        textParts.push(text);
        
        // Also check for fields in this text
        const fieldMatches = text.matchAll(/\{\{([A-Z][A-Z0-9_]*)\}\}/gi);
        for (const fm of fieldMatches) {
          const field = `{{${fm[1].toUpperCase()}}}`;
          if (!foundFields.includes(field)) {
            foundFields.push(field);
          }
        }
      }
    }
    
    // Look for hex strings (UTF-16 encoded text)
    const hexStrings = streamContent.matchAll(/<([0-9A-Fa-f]{4,})>/g);
    for (const hexMatch of hexStrings) {
      try {
        const hex = hexMatch[1];
        let decoded = '';
        
        // Try UTF-16BE decoding
        for (let i = 0; i < hex.length; i += 4) {
          if (i + 4 <= hex.length) {
            const charCode = parseInt(hex.substr(i, 4), 16);
            if (charCode >= 32 && charCode < 65535) {
              decoded += String.fromCharCode(charCode);
            }
          }
        }
        
        // Fallback to single-byte if UTF-16 gives nonsense
        if (!decoded || !/[a-zA-Z]/.test(decoded)) {
          decoded = '';
          for (let i = 0; i < hex.length; i += 2) {
            decoded += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
          }
        }
        
        if (decoded.trim() && decoded.length > 1 && /[a-zA-Z{}\[\]<>_]/.test(decoded)) {
          textParts.push(decoded);
          
          // Check for fields
          const fieldMatches = decoded.matchAll(/\{\{([A-Z][A-Z0-9_]*)\}\}/gi);
          for (const fm of fieldMatches) {
            const field = `{{${fm[1].toUpperCase()}}}`;
            if (!foundFields.includes(field)) {
              foundFields.push(field);
            }
          }
        }
      } catch (e) {
        // Skip invalid hex
      }
    }
  }
  
  // Add found fields to text parts
  if (foundFields.length > 0) {
    textParts.push(...foundFields);
  }
  
  // Clean and join extracted text
  const extractedText = textParts
    .map(t => t.trim())
    .filter(t => t.length > 0)
    .join(' ');
  
  console.log(`PDF extraction: ${textParts.length} text parts, ${foundFields.length} fields found directly`);
  
  if (extractedText.length < 10 && foundFields.length === 0) {
    throw new Error('Não foi possível extrair texto do PDF. O arquivo pode estar protegido ou conter apenas imagens. Tente usar TXT ou cole o conteúdo manualmente.');
  }
  
  return extractedText;
}

interface ContractField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'cpf_cnpj' | 'email' | 'phone';
  required: boolean;
}

function detectFields(content: string): ContractField[] {
  // Normalize content - PDFs often have broken up text
  let normalizedContent = content
    // Remove extra whitespace between characters
    .replace(/\{\s*\{/g, '{{')
    .replace(/\}\s*\}/g, '}}')
    // Handle common PDF text extraction issues
    .replace(/\{ \{/g, '{{')
    .replace(/\} \}/g, '}}')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // Multiple patterns to catch different variations
  const patterns = [
    /\{\{([A-Z][A-Z0-9_]*)\}\}/g,           // Standard: {{CAMPO}}
    /\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g,      // Case insensitive
    /\{ \{ ([A-Z][A-Z0-9_ ]*) \} \}/g,       // Spaced: { { CAMPO } }
    /\[\[([A-Z][A-Z0-9_]*)\]\]/g,            // Alternative: [[CAMPO]]
    /<<([A-Z][A-Z0-9_]*)>>/g,                // Alternative: <<CAMPO>>
    /__([A-Z][A-Z0-9_]*)__/g,                // Alternative: __CAMPO__
    /\(([A-Z][A-Z0-9_ ]{2,})\)/g,             // Alternative: (CAMPO)  (ex: BOLT templates)
  ];
  
  const fields: ContractField[] = [];
  const seen = new Set<string>();

  for (const pattern of patterns) {
    const matches = normalizedContent.matchAll(pattern);
    for (const match of matches) {
      // Clean up the name - remove spaces and normalize
      let name = match[1].replace(/\s+/g, '_').toUpperCase();

      // Evita falsos positivos de texto normal entre parêntesis.
      // Para o padrão ( ... ), só aceitamos tokens com '_' ou datas.
      if (!name.includes('_') && !name.startsWith('DATA')) continue;
      
      if (seen.has(name)) continue;
      if (name.length < 2) continue; // Skip very short matches
      
      seen.add(name);

      fields.push({
        id: crypto.randomUUID(),
        name,
        label: formatFieldLabel(name),
        type: inferFieldType(name),
        required: isRequiredField(name),
      });
    }
  }

  return fields;
}

function formatFieldLabel(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function inferFieldType(name: string): ContractField['type'] {
  const lowered = name.toLowerCase();
  
  if (lowered.includes('data') || lowered.includes('date')) return 'date';
  if (lowered.includes('valor') || lowered.includes('preco') || lowered.includes('montante')) return 'currency';
  if (lowered.includes('cpf') || lowered.includes('cnpj') || lowered.includes('nif')) return 'cpf_cnpj';
  if (lowered.includes('email')) return 'email';
  if (lowered.includes('telefone') || lowered.includes('telemovel') || lowered.includes('phone')) return 'phone';
  if (lowered.includes('numero') || lowered.includes('quantidade') || lowered.includes('qtd')) return 'number';
  
  return 'text';
}

function isRequiredField(name: string): boolean {
  const requiredFields = [
    'NOME',
    'NIF',
    'DATA',
    'VALOR',
    'ENDERECO',
    'MATRICULA',
  ];
  
  return requiredFields.some((f) => name.includes(f));
}
