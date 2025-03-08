import { useEffect, useState } from "react";

interface GltfListProps {
  handleAddObject: (url: string) => void;
}

const GltfList: React.FC<GltfListProps> = ({ handleAddObject }) => {
  const [gltfFiles, setGltfFiles] = useState<string[]>([]);

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

  return (
    <div className="banner">
      {gltfFiles.length === 0 ? (
        <p>Loading models...</p>
      ) : (
        gltfFiles.map((file, index) => (
          <button
            key={index}
            onClick={() => handleAddObject(`http://127.0.0.1:5000/files/${file}`)}
            className="bouton"
          >
            {file.replace(".gltf", "").replace(".glb", "")}
          </button>
        ))
      )}
    </div>
  );
};

export default GltfList;
