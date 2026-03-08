import { supabase } from './supabase';

/**
 * Uploads a file to Supabase Storage (public bucket: 'media').
 * Returns a public URL to the uploaded file.
 */
export const uploadToIPFS = async (file) => {
    const ext = file.name.split('.').pop();
    const path = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
        .from('media')
        .upload(path, file, { upsert: false });

    if (error) throw new Error('Upload failed: ' + error.message);

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);

    return {
        hash: path,
        url: publicUrl,
        metadata: {
            name: file.name,
            type: file.type,
            size: file.size,
            timestamp: Date.now()
        }
    };
};

export const createMetadataJSON = async (name, description, imageCallbackUrl) => {
    const metadata = {
        name,
        description,
        image: imageCallbackUrl,
        attributes: [
            { trait_type: "Platform", value: "RedFlag Dating" },
            { trait_type: "Verification", value: "On-Chain" }
        ]
    };
    const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    return uploadToIPFS(new File([blob], "metadata.json", { type: 'application/json' }));
};
