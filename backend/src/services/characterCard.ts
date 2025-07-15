import { readFileSync } from 'fs';
import { inflateSync } from 'zlib';

export interface CharacterCard {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  alternate_greetings?: string[];
  character_book?: any;
  tags?: string[];
  creator?: string;
  character_version?: string;
  avatar?: string;
}

interface CharacterCardV2 {
  spec: 'chara_card_v2';
  spec_version: '2.0';
  data: CharacterCard;
}

export class CharacterCardService {
  static async extractFromPNG(filePath: string): Promise<CharacterCard | null> {
    try {
      const data = readFileSync(filePath);
      
      // PNG magic number
      const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
      if (!data.subarray(0, 8).equals(pngSignature)) {
        console.error('Not a valid PNG file');
        return null;
      }

      let pos = 8;
      let characterData: string | null = null;

      // Read chunks
      while (pos < data.length) {
        // Read chunk length (4 bytes, big-endian)
        const length = data.readUInt32BE(pos);
        pos += 4;

        // Read chunk type (4 bytes)
        const type = data.subarray(pos, pos + 4).toString('ascii');
        pos += 4;

        // Read chunk data
        const chunkData = data.subarray(pos, pos + length);
        pos += length;

        // Skip CRC (4 bytes)
        pos += 4;

        // Check if it's a tEXt chunk
        if (type === 'tEXt') {
          // Find null separator between keyword and text
          let nullIndex = -1;
          for (let i = 0; i < chunkData.length; i++) {
            if (chunkData[i] === 0) {
              nullIndex = i;
              break;
            }
          }

          if (nullIndex !== -1) {
            const keyword = chunkData.subarray(0, nullIndex).toString('ascii');
            const textData = chunkData.subarray(nullIndex + 1).toString('latin1');

            // Check for character data chunks
            if (keyword === 'chara' || keyword === 'ccv3') {
              characterData = textData;
              break;
            }
          }
        }

        // Stop at IEND chunk
        if (type === 'IEND') {
          break;
        }
      }

      if (!characterData) {
        return null;
      }

      // Decode base64 and parse JSON
      const decodedData = Buffer.from(characterData, 'base64').toString('utf8');
      const parsed = JSON.parse(decodedData);

      // Handle different formats
      if (parsed.spec === 'chara_card_v2' && parsed.spec_version === '2.0') {
        return parsed.data;
      } else if (parsed.spec === 'chara_card_v3') {
        return parsed.data;
      } else {
        // Handle old format (direct character data)
        return parsed;
      }
    } catch (error) {
      console.error('Error extracting character from PNG:', error);
      return null;
    }
  }

  static async parseCharX(filePath: string): Promise<CharacterCard | null> {
    try {
      const data = readFileSync(filePath);
      
      // CharX files are typically JSON or compressed JSON
      let jsonData: string;
      
      try {
        // Try to parse as plain JSON first
        jsonData = data.toString('utf8');
        return JSON.parse(jsonData);
      } catch {
        // If that fails, try to decompress
        try {
          const decompressed = inflateSync(data);
          jsonData = decompressed.toString('utf8');
          return JSON.parse(jsonData);
        } catch (error) {
          console.error('Failed to parse CharX file:', error);
          return null;
        }
      }
    } catch (error) {
      console.error('Error reading CharX file:', error);
      return null;
    }
  }

  static validateCharacterCard(card: any): card is CharacterCard {
    return (
      typeof card === 'object' &&
      typeof card.name === 'string' &&
      typeof card.description === 'string'
    );
  }

  static async embedInPNG(characterData: CharacterCard, imagePath: string, outputPath: string): Promise<void> {
    const imageData = readFileSync(imagePath);
    const png = PNG.sync.read(imageData);
    
    // Create tEXt chunk with character data
    const characterJson = JSON.stringify(characterData);
    const characterBase64 = Buffer.from(characterJson).toString('base64');
    const textChunk = Buffer.concat([
      Buffer.from('chara\0'),
      Buffer.from(characterBase64)
    ]);
    
    // Add the chunk to the PNG
    (png as any).chunks = (png as any).chunks || [];
    (png as any).chunks.push({
      type: 'tEXt',
      data: textChunk
    });
    
    // Write the modified PNG
    const outputBuffer = PNG.sync.write(png);
    require('fs').writeFileSync(outputPath, outputBuffer);
  }
}