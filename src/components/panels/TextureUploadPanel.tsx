import { useState, useEffect } from "react";
import axios from "axios";

const TextureUpload = ({ onClose }: { onClose?: () => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
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
      
      // Create preview URL for the selected image
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      fileReader.readAsDataURL(selectedFile);
    }
  };

  const handleCategoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCategory(event.target.value);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a texture file.");
      return;
    }

    const formData = new FormData();
    formData.append("texture", file);
    if (category) {
      formData.append("category", category);
    }

    try {
      setUploading(true);
      setMessage("");
      const response = await axios.post("http://127.0.0.1:5000/api/textures/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        
      });
      setMessage(response.data.message);
      // Clear form after successful upload
      if (response.data.success) {
        setFile(null);
        setCategory("");
        setPreviewUrl(null);
      }
    } catch (error) {
      setMessage("Failed to upload texture.");
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
          <h2 className="modif">Upload Texture</h2>
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
          <label className="titre-label">Select Texture File</label>
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
              accept="image/*" 
              onChange={handleFileChange} 
              style={{
                display: "none"
              }}
              id="texture-file-input"
            />
            <label 
              htmlFor="texture-file-input"
              style={{
                display: "block",
                cursor: "pointer"
              }}
            >
              {previewUrl ? (
                <div style={{ marginBottom: "10px" }}>
                  <img 
                    src={previewUrl} 
                    alt="Texture preview" 
                    style={{ 
                      maxWidth: "100%", 
                      maxHeight: "150px", 
                      borderRadius: "4px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)" 
                    }} 
                  />
                </div>
              ) : (
                <div style={{ 
                  color: "#946B54", 
                  fontSize: "40px", 
                  marginBottom: "10px" 
                }}>
                  +
                </div>
              )}
              <div style={{ color: "#946B54", fontWeight: "bold" }}>
                {file ? file.name : "Click to select a texture file"}
              </div>
            </label>
          </div>
        </div>
        
        <div className="panel-section">
          <label className="titre-label">Category (optional)</label>
          <input
            type="text"
            placeholder="e.g., Wood, Stone, Fabric..."
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
        
        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="bouton-popup"
          style={{
            width: "100%",
            marginTop: "10px"
          }}
        >
          {uploading ? "Uploading..." : "Upload Texture"}
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

export default TextureUpload;
