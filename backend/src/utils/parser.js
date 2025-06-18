const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

async function parseDocument(filePath) {
    try {
        const ext = path.extname(filePath).toLowerCase();
        console.log(`Parsing file: ${filePath}, extension: ${ext}`);
        
        const data = await fs.readFile(filePath);
        console.log(`File size: ${data.length} bytes`);

        let text;
        if (ext === '.pdf') {
            const result = await pdf(data);
            text = result.text;
            console.log(`PDF parsed, extracted ${text.length} characters`);
        } else if (ext === '.docx') {
            console.log(`Processing DOCX file, buffer length: ${data.length}`);
            
            // Try both buffer and file path approaches
            let result;
            try {
                // Method 1: Using buffer
                result = await mammoth.extractRawText({buffer: data});
                console.log('Buffer method success');
            } catch (bufferError) {
                console.log('Buffer method failed, trying file path method');
                // Method 2: Using file path directly
                result = await mammoth.extractRawText({path: filePath});
                console.log('File path method success');
            }
            
            console.log('Mammoth result:', {
                hasValue: !!result.value,
                valueLength: result.value ? result.value.length : 0,
                messages: result.messages,
                valuePreview: result.value ? result.value.substring(0, 100) : 'No value'
            });
            
            if (!result.value || result.value.length === 0) {
                throw new Error('No text extracted from DOCX file');
            }
            
            text = result.value;
            console.log(`DOCX parsed, extracted ${text.length} characters`);
        } else {
            throw new Error(`Unsupported file extension: ${ext}`);
        }

        // Fix the regex - was /\r\n/d,'n' which is invalid
        const cleanText = text
            .replace(/\r\n/g, '\n')  // Fix: use 'g' flag and proper '\n'
            .replace(/[\t]+/g, ' ')
            .trim();

        console.log(`Cleaned text length: ${cleanText.length}`);
        
        // Validate text content
        if (cleanText.length < 20) {
            throw new Error('Parsed text too short—document may be empty or corrupt');
        }
        
        const wordCount = cleanText.split(/\s+/).filter(word => word.length > 0).length;
        if (wordCount > 50_000) {
            throw new Error('Document too large—please upload something smaller');
        }
        
        console.log(`Validation passed: ${wordCount} words`);
        
        return cleanText;

    } catch (error) {
        console.error('Error parsing document:', error);
        throw error;
    }
}

module.exports = {parseDocument};