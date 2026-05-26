import * as http from 'http';
import { MAX_HTTP_BODY } from '../constants';

export function readRequestBody(req: http.IncomingMessage, maxBytes = MAX_HTTP_BODY): Promise<string> {
    return new Promise((resolve, reject) => {
        let received = 0;
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => {
            received += chunk.length;
            if (received > maxBytes) {
                reject(new Error('BODY_TOO_LARGE'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        req.on('error', reject);
    });
}
