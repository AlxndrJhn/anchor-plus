import sharp from 'sharp';

/**
 * A JPEG with the small flaw some scanner apps write (a baseline scan header
 * with progressive parameters): viewers show it, sharp's default refuses it
 * with "Invalid SOS parameters for sequential JPEG".
 */
export async function flawedJpeg(size = 64): Promise<Buffer> {
  const jpeg = await sharp({
    create: { width: size, height: size, channels: 3, background: '#c33' },
  })
    .jpeg()
    .toBuffer();
  const sos = jpeg.indexOf(Buffer.from([0xff, 0xda]));
  const flawed = Buffer.from(jpeg);
  // The header's last byte: successive approximation, 0 in a baseline scan.
  flawed[sos + 2 + jpeg.readUInt16BE(sos + 2) - 1] = 0x01;
  return flawed;
}
