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
  static async extractFromPNGBuffer(buffer: Buffer): Promise<CharacterCard | null> {
    try {
      const data = buffer;
      
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

        if (type === 'tEXt') {
          // Find null separator
          const nullIndex = chunkData.indexOf(0);
          if (nullIndex !== -1) {
            const keyword = chunkData.subarray(0, nullIndex).toString('utf-8');
            const textData = chunkData.subarray(nullIndex + 1).toString('utf-8');
            
            if (keyword === 'chara' || keyword === 'ccv3') {
              characterData = textData;
              break;
            }
          }
        }

        // Stop at IEND chunk
        if (type === 'IEND') break;
      }

      if (!characterData) {
        console.error('No character data found in PNG');
        return null;
      }

      try {
        // Try to decode as base64 first
        const decodedData = Buffer.from(characterData, 'base64').toString('utf-8');
        const parsed = JSON.parse(decodedData);
        
        // Handle V2/V3 format
        if (parsed.spec === 'chara_card_v2' && parsed.data) {
          return parsed.data;
        }
        
        return parsed;
      } catch (e) {
        // If base64 decode fails, try parsing directly
        try {
          const parsed = JSON.parse(characterData);
          if (parsed.spec === 'chara_card_v2' && parsed.data) {
            return parsed.data;
          }
          return parsed;
        } catch (e2) {
          console.error('Failed to parse character data:', e2);
          return null;
        }
      }
    } catch (error) {
      console.error('PNG extraction error:', error);
      return null;
    }
  }

  static async parseCharXBuffer(buffer: Buffer): Promise<CharacterCard | null> {
    try {
      // Try parsing as JSON first
      const text = buffer.toString('utf-8');
      const data = JSON.parse(text);
      
      // Handle V2/V3 format
      if (data.spec === 'chara_card_v2' && data.data) {
        return data.data;
      }
      
      return data;
    } catch (error) {
      console.error('CharX parsing error:', error);
      return null;
    }
  }

  static async extractFromPNG(filePath: string): Promise<CharacterCard | null> {
    try {
      const data = readFileSync(filePath);
      return this.extractFromPNGBuffer(data);
    } catch (error) {
      console.error('Error extracting character from PNG:', error);
      return null;
    }
  }

  static async parseCharX(filePath: string): Promise<CharacterCard | null> {
    try {
      const data = readFileSync(filePath);
      return this.parseCharXBuffer(data);
    } catch (error) {
      console.error('Error parsing CharX file:', error);
      return null;
    }
  }

  static validateCharacterCard(card: any): boolean {
    return !!(card && card.name && card.description);
  }
}