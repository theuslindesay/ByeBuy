import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function CreateItemModal({ isOpen, onClose, currentUser, onCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    condition: 'Novo',
    total: '',
    reason: ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!isOpen || !currentUser) {
    return null;
  }

  const isOng = currentUser.type === 'ONG';

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          if (width > 800) {
            height *= 800 / width;
            width = 800;
          }

          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
    });
  };

  const generateItemCode = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';

    let code = 'BBY-';

    code += letters.charAt(Math.floor(Math.random() * letters.length));
    code += letters.charAt(Math.floor(Math.random() * letters.length));
    code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    code += numbers.charAt(Math.floor(Math.random() * numbers.length));

    return code;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!imageFile) {
      setFeedback({ type: 'error', message: 'A foto é obrigatória.' });
      return;
    }

    setLoading(true);

    const base64Img = await compressImage(imageFile);
    const newCode = generateItemCode();

    const dbData = {
      title: formData.title,
      category: formData.category,
      owner_uid: currentUser.id,
      image: base64Img,
      status: 'active',
      item_code: newCode,
      type: isOng ? 'need' : 'donation',
      condition: isOng ? null : formData.condition,
      total_needed: isOng ? parseInt(formData.total) : null,
      current_amount: isOng ? 0 : null,
      reason: isOng ? formData.reason : null
    };

    const { error } = await supabase
      .from('items')
      .insert([dbData]);

    setLoading(false);

    if (error) {
      setFeedback({ type: 'error', message: 'Erro: ' + error.message });
    } else {
      setFeedback({ type: 'success', message: 'Publicado com sucesso! Código gerado: ' + newCode });

      setTimeout(() => {
        setFormData({
          title: '',
          category: '',
          condition: 'Novo',
          total: '',
          reason: ''
        });

        setImageFile(null);
        setFeedback(null);

        if (onCreated) {
          onCreated();
        }

        onClose();
      }, 2000);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <span className="close-modal" onClick={onClose}>
          &times;
        </span>

        <h2 style={{ color: 'var(--primary-color)', marginBottom: '20px' }}>
          {isOng ? 'Nova Solicitação' : 'Novo Desapego'}
        </h2>

        {feedback && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '18px',
              background: feedback.type === 'error' ? '#fff3f3' : '#f1f7ea',
              color: feedback.type === 'error' ? '#d96b6b' : '#6a8c3a',
              border: `1px solid ${feedback.type === 'error' ? '#fcdede' : '#dcedc8'}`,
              fontWeight: '500',
              fontSize: '0.95rem',
              textAlign: 'center'
            }}
          >
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Título</label>
            <input
              type="text"
              value={formData.title}
              onChange={function (e) {
                setFormData({
                  ...formData,
                  title: e.target.value
                });
              }}
              required
            />
          </div>

          <div className="form-group">
            <label>Categoria</label>
            <input
              type="text"
              value={formData.category}
              onChange={function (e) {
                setFormData({
                  ...formData,
                  category: e.target.value
                });
              }}
              required
            />
          </div>

          {!isOng && (
            <div className="form-group">
              <label>Condição</label>
              <select
                value={formData.condition}
                onChange={function (e) {
                  setFormData({
                    ...formData,
                    condition: e.target.value
                  });
                }}
              >
                <option value="Novo">Novo</option>
                <option value="Usado">Usado</option>
              </select>
            </div>
          )}

          {isOng && (
            <>
              <div className="form-group">
                <label>Meta total</label>
                <input
                  type="number"
                  value={formData.total}
                  onChange={function (e) {
                    setFormData({
                      ...formData,
                      total: e.target.value
                    });
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label>Motivo do pedido</label>
                <textarea
                  value={formData.reason}
                  onChange={function (e) {
                    setFormData({
                      ...formData,
                      reason: e.target.value
                    });
                  }}
                  required
                ></textarea>
              </div>
            </>
          )}

          <div className="form-group">
            <label>Imagem</label>
            <input
              type="file"
              accept="image/*"
              onChange={function (e) {
                if (e.target.files && e.target.files[0]) {
                  setImageFile(e.target.files[0]);
                }
              }}
            />
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Publicando...' : 'Publicar'}
          </button>
        </form>
      </div>
    </div>
  );
}