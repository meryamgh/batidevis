import { useState, useEffect } from "react";
import axios from "axios";

const ObjectUpload = ({ onClose }: { onClose?: () => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Add event listener for Escape key to close the modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onClose) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscKey);
    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [onClose]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      
      // For 3D models, we can't generate a preview easily
      // We'll just show the file name
      setPreviewUrl(null);
    }
  };

  const handleCategoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCategory(event.target.value);
  };

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(event.target.value);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a 3D object file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (category) {
      formData.append("category", category);
    }
    if (description) {
      formData.append("description", description);
    }
    
    try {
      setUploading(true);
      setMessage("");
      const response = await axios.post("http://127.0.0.1:5000/api/objects/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(response.data.message);
      // Clear form after successful upload
      if (response.data.success) {
        setFile(null);
        setCategory("");
        setDescription("");
        setPreviewUrl(null);
      }
    } catch (error) {
      setMessage("Failed to upload 3D object.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 999
        }}
        onClick={onClose}
      />
      
      <div className="object-panel" style={{ 
        position: "fixed", 
        top: "50%", 
        left: "50%", 
        transform: "translate(-50%, -50%)",
        zIndex: 1000,
        width: "400px",
        maxWidth: "90vw"
      }}>
        <div className="title_popup">
          <h2 className="modif">Upload 3D Object</h2>
          {onClose && (
            <button 
              onClick={onClose} 
              className="bouton-close"
              style={{ position: "absolute", right: "10px", top: "10px" }}
            >
              ×
            </button>
          )}
        </div>
        
        <div className="panel-section">
          <label className="titre-label">Select 3D Object File</label>
          <div className="file-input-container" style={{
            border: "2px dashed #B0846A",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
            marginBottom: "15px",
            cursor: "pointer",
            backgroundColor: "#f9f5f2"
          }}>
            <input 
              type="file" 
              accept=".glb,.gltf,.obj,.fbx" 
              onChange={handleFileChange} 
              style={{
                display: "none"
              }}
              id="object-file-input"
            />
            <label 
              htmlFor="object-file-input"
              style={{
                display: "block",
                cursor: "pointer"
              }}
            >
              <div style={{ 
                color: "#946B54", 
                fontSize: "40px", 
                marginBottom: "10px" 
              }}>
                {file ? "✓" : "+"}
              </div>
              <div style={{ color: "#946B54", fontWeight: "bold", marginBottom: "5px" }}>
                {file ? file.name : "Click to select a 3D object file"}
              </div>
              <div style={{ color: "#666", fontSize: "12px" }}>
                Supported formats: GLB, GLTF, OBJ, FBX
              </div>
            </label>
          </div>
        </div>
        
        <div className="panel-section">
          <label className="titre-label">Category (optional)</label>
          <input
            type="text"
            placeholder="e.g., Furniture, Decoration, Electronics..."
            value={category}
            onChange={handleCategoryChange}
            className="selection"
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "15px",
              borderRadius: "4px",
              border: "1px solid #ddd"
            }}
          />
        </div>

        <div className="panel-section">
          <label className="titre-label">Description (optional)</label>
          <textarea
            placeholder="Enter details about the object..."
            value={description}
            onChange={handleDescriptionChange}
            className="selection"
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "15px",
              borderRadius: "4px",
              border: "1px solid #ddd",
              minHeight: "80px",
              resize: "vertical"
            }}
          />
        </div>
        
        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="bouton-popup"
          style={{
            width: "100%",
            marginTop: "10px"
          }}
        >
          {uploading ? "Uploading..." : "Upload 3D Object"}
        </button>
        
        {message && (
          <div className={`message ${message.includes("Failed") ? "error" : "success"}`} style={{
            marginTop: "15px",
            padding: "10px",
            borderRadius: "4px",
            backgroundColor: message.includes("Failed") ? "#ffebee" : "#e8f5e9",
            color: message.includes("Failed") ? "#c62828" : "#2e7d32",
            textAlign: "center",
            fontWeight: "500"
          }}>
            {message}
          </div>
        )}
      </div>
    </>
  );
};

export default ObjectUpload;
