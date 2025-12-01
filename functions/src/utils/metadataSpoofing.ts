/**
 * Image Metadata Spoofing Utilities (Node.js version)
 *
 * Spoofs EXIF metadata in JPEG images to make them appear unique
 */

// @ts-ignore - piexifjs doesn't have TypeScript definitions
import piexif from 'piexifjs';
import * as admin from 'firebase-admin';

/**
 * Generate a random date within the past 2 years for metadata spoofing
 */
function generateRandomDate(): Date {
  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  const randomTime = twoYearsAgo.getTime() + Math.random() * (now.getTime() - twoYearsAgo.getTime());
  return new Date(randomTime);
}

/**
 * Generate random GPS coordinates (continental US for realism)
 */
function generateRandomGPS() {
  // Continental US approximate bounds
  const lat = 25 + Math.random() * 24; // 25°N to 49°N
  const lon = -125 + Math.random() * 58; // -125°W to -67°W
  return { lat, lon };
}

/**
 * Camera makes and models for realistic spoofing
 */
const CAMERA_OPTIONS = [
  { make: 'Apple', model: 'iPhone 14 Pro' },
  { make: 'Apple', model: 'iPhone 13' },
  { make: 'Apple', model: 'iPhone 12 Pro Max' },
  { make: 'Apple', model: 'iPhone 15 Pro' },
  { make: 'Samsung', model: 'Galaxy S23 Ultra' },
  { make: 'Samsung', model: 'Galaxy S22' },
  { make: 'Samsung', model: 'Galaxy S24' },
  { make: 'Google', model: 'Pixel 7 Pro' },
  { make: 'Google', model: 'Pixel 6' },
  { make: 'Google', model: 'Pixel 8 Pro' },
];

/**
 * Spoof EXIF metadata in a JPEG image buffer
 * @param imageBuffer - Buffer containing the JPEG image data
 * @returns Buffer with spoofed EXIF data
 */
export async function spoofImageMetadata(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Convert buffer to base64 data URL
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    let exifObj: any = {};

    // Try to read existing EXIF data
    try {
      const exifData = piexif.load(dataUrl);
      exifObj = exifData;
    } catch (err) {
      // No EXIF data exists, create new object
      exifObj = {
        '0th': {},
        Exif: {},
        GPS: {},
        Interop: {},
        '1st': {},
        thumbnail: null,
      };
    }

    // Generate random values for spoofing
    const randomDate = generateRandomDate();
    const dateString = randomDate.toISOString().slice(0, 19).replace('T', ' ');
    const randomGPS = generateRandomGPS();
    const randomCamera = CAMERA_OPTIONS[Math.floor(Math.random() * CAMERA_OPTIONS.length)];

    // Modify date/time stamps
    exifObj['0th'][piexif.ImageIFD.DateTime] = dateString;
    exifObj.Exif[piexif.ExifIFD.DateTimeOriginal] = dateString;
    exifObj.Exif[piexif.ExifIFD.DateTimeDigitized] = dateString;

    // Modify camera info
    exifObj['0th'][piexif.ImageIFD.Make] = randomCamera.make;
    exifObj['0th'][piexif.ImageIFD.Model] = randomCamera.model;
    exifObj['0th'][piexif.ImageIFD.Software] = 'iOS 17.2';

    // Modify GPS coordinates (or remove them randomly)
    if (Math.random() > 0.5) {
      // Add spoofed GPS
      exifObj.GPS[piexif.GPSIFD.GPSLatitudeRef] = randomGPS.lat >= 0 ? 'N' : 'S';
      exifObj.GPS[piexif.GPSIFD.GPSLatitude] = piexif.GPSHelper.degToDmsRational(
        Math.abs(randomGPS.lat)
      );
      exifObj.GPS[piexif.GPSIFD.GPSLongitudeRef] = randomGPS.lon >= 0 ? 'E' : 'W';
      exifObj.GPS[piexif.GPSIFD.GPSLongitude] = piexif.GPSHelper.degToDmsRational(
        Math.abs(randomGPS.lon)
      );
    } else {
      // Remove GPS data
      exifObj.GPS = {};
    }

    // Add some random variation to other metadata
    if (exifObj.Exif) {
      exifObj.Exif[piexif.ExifIFD.PixelXDimension] = undefined;
      exifObj.Exif[piexif.ExifIFD.PixelYDimension] = undefined;
    }

    // Dump modified EXIF data and insert into image
    const exifBytes = piexif.dump(exifObj);
    const newDataUrl = piexif.insert(exifBytes, dataUrl);

    // Convert data URL back to Buffer
    const base64Data = newDataUrl.replace(/^data:image\/jpeg;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    return buffer;
  } catch (error) {
    console.error('Error spoofing metadata:', error);
    // If spoofing fails, return original buffer
    return imageBuffer;
  }
}

/**
 * Download image from Firebase Storage URL, spoof it, and upload to temp location
 * @param imageUrl - Firebase Storage URL
 * @param userId - User ID for temp storage path
 * @returns Public URL of spoofed image in temp storage
 */
export async function spoofAndUploadImage(
  imageUrl: string,
  userId: string
): Promise<{ url: string; tempPath: string }> {
  try {
    console.log('Downloading image from:', imageUrl);

    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    console.log('Spoofing image metadata...');

    // Spoof the metadata
    const spoofedBuffer = await spoofImageMetadata(imageBuffer);

    // Upload to temp storage
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const tempPath = `temp/${userId}/${timestamp}_${randomStr}.jpg`;

    console.log('Uploading spoofed image to:', tempPath);

    const bucket = admin.storage().bucket();
    const file = bucket.file(tempPath);

    await file.save(spoofedBuffer, {
      metadata: {
        contentType: 'image/jpeg',
      },
    });

    // Make the file publicly accessible
    await file.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${tempPath}`;

    console.log('Spoofed image uploaded to:', publicUrl);

    return {
      url: publicUrl,
      tempPath,
    };
  } catch (error) {
    console.error('Error in spoofAndUploadImage:', error);
    throw error;
  }
}

/**
 * Delete temporary spoofed image from storage
 * @param tempPath - Path to the temp file in storage
 */
export async function deleteTempImage(tempPath: string): Promise<void> {
  try {
    const bucket = admin.storage().bucket();
    await bucket.file(tempPath).delete();
    console.log('Deleted temp image:', tempPath);
  } catch (error) {
    console.error('Error deleting temp image:', error);
    // Don't throw - cleanup errors shouldn't fail the post
  }
}
