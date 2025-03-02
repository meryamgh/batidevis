import { useEffect, useState, useRef } from "react";

interface GltfListProps {
  handleAddObject: (url: string) => void;
}

const GltfList: React.FC<GltfListProps> = ({ handleAddObject }) => {
  const [gltfFiles, setGltfFiles] = useState<string[]>([]);
  const [customTextures, setCustomTextures] = useState<{ [key: string]: string }>({});
  const modelInputRef = useRef<HTMLInputElement>(null);
  const textureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch the list of GLTF files from Flask backend
    const fetchFiles = async () => {
      try {
        const response = await fetch("http://127.0.0.1:5000/list_files");
        const data = await response.json();
        if (response.ok) {
          setGltfFiles(data.files);
        } else {
          console.error("Error fetching files:", data.error);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };

    fetchFiles();
  }, []);

  const handleModelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.0.1:5000/upload_model', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        handleAddObject(`http://127.0.0.1:5000/files/${data.filename}`);
        // Rafraîchir la liste des fichiers
        const filesResponse = await fetch("http://127.0.0.1:5000/list_files");
        const filesData = await filesResponse.json();
        if (filesResponse.ok) {
          setGltfFiles(filesData.files);
        }
      } else {
        console.error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleTextureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.0.1:5000/upload_texture', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        const textureUrl = `http://127.0.0.1:5000/textures/${data.filename}`;
        setCustomTextures(prev => ({
          ...prev,
          [file.name]: textureUrl
        }));
      } else {
        console.error('Texture upload failed');
      }
    } catch (error) {
      console.error('Error uploading texture:', error);
    }
  };

  return (
    <div className="banner">
      <div className="import-buttons" style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '10px'
      }}>
        <input
          type="file"
          ref={modelInputRef}
          style={{ display: 'none' }}
          accept=".gltf,.glb"
          onChange={handleModelUpload}
        />
        <button
          onClick={() => modelInputRef.current?.click()}
          className="bouton"
          style={{
            backgroundColor: '#4CAF50',
            color: 'white'
          }}
        >
          Importer un modèle 3D
        </button>

        <input
          type="file"
          ref={textureInputRef}
          style={{ display: 'none' }}
          accept=".png,.jpg,.jpeg"
          onChange={handleTextureUpload}
        />
        <button
          onClick={() => textureInputRef.current?.click()}
          className="bouton"
          style={{
            backgroundColor: '#2196F3',
            color: 'white'
          }}
        >
          Importer une texture
        </button>
      </div>

      {gltfFiles.length === 0 ? (
        <p>Loading models...</p>
      ) : (
        <div>
          <div className="models-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '10px'
          }}>
            {gltfFiles.map((file, index) => (
              <button
                key={index}
                onClick={() => handleAddObject(`http://127.0.0.1:5000/files/${file}`)}
                className="bouton"
              >
                {file.replace(".gltf", "").replace(".glb", "")}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GltfList; 