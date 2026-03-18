import imageCompression from 'browser-image-compression';

export const compressImage = async (file) => {
  // Si déjà sous 5 Mo, on garde tel quel
  if (file.size <= 5 * 1024 * 1024) {
    return file;
  }

  const options = {
    maxSizeMB: 5,              // Limite 5 Mo
    maxWidthOrHeight: 2048,    // Redimensionne si trop grand
    useWebWorker: true,        // Plus fluide
    fileType: 'image/webp',    // Format optimisé
    initialQuality: 0.85       // Qualité élevée
  };

  try {
    const compressedFile = await imageCompression(file, options);
    
    console.log(`✅ Compressé: ${(file.size / 1024 / 1024).toFixed(2)}Mo → ${(compressedFile.size / 1024 / 1024).toFixed(2)}Mo`);
    
    return compressedFile;
    
  } catch (error) {
    console.error('❌ Erreur compression:', error);
    throw new Error('Impossible de compresser l\'image');
  }
};