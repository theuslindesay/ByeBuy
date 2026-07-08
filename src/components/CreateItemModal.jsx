import { useState } from 'react';
import { supabase } from '../supabaseClient';

const CATEGORIES = [
  'Roupas',
  'Calçados',
  'Eletrônicos',
  'Móveis',
  'Livros',
  'Brinquedos',
  'Alimentos',
  'Higiene e Limpeza',
  'Utensílios Domésticos',
  'Outros'
];

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

  if (!isOpen || !currentUser) return null;

  const isOng = currentUser.type === 'ONG';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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

  const resetForm = () => {
    setFormData({
      title: '',
      category: '',
      condition: 'Novo',
      total: '',
      reason: ''
    });
    setImageFile(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Preencha o título.');
      return;
    }

    if (!formData.category) {
      alert('Selecione uma categoria.');
      return;
    }

    if (!imageFile) {
      alert('A foto é obrigatória.');
      return;
    }

    let parsedTotal = null;

    if (isOng) {
      parsedTotal = parseInt(formData.total, 10);

      if (!formData.total || isNaN(parsedTotal) || parsedTotal < 1) {
        alert('A meta deve ser um número igual ou maior que 1.');
        return;
      }

      if (!formData.reason.trim()) {
        alert('Descreva o motivo do pedido.');
        return;
      }
    }

    setLoading(true);

    try {
      const base64Img = await compressImage(imageFile);

      const dbData = {
        title: formData.title.trim(),
        category: formData.category,
        owner_uid: currentUser.id,
        image: base64Img,
        status: 'active',
        item_code: Math.random().toString(36).substring(2, 7).toUpperCase(),
        type: isOng ? 'need' : 'donation',
        condition: isOng ? null : formData.condition,
        total_needed: isOng ? parsedTotal : null,
        current_amount: isOng ? 0 : null,
        reason: isOng ? formData.reason.trim() : null
      };

      const { error } = await supabase.from('items').insert([dbData]);

      if (error) {
        alert('Erro: ' + error.message);
        return;
      }

      alert('Publicado com sucesso!');
      resetForm();
      onCreated();
      onClose();
    } catch (error) {
      alert('Erro ao publicar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content" style={{ maxWidth: '560px' }}>
        <span
          className="close-modal"
          onClick={handleClose}
          style={{ background: 'none', border: 'none', lineHeight: 1 }}
        >
          ×
        </span>

        <h2 style={{ margin: '0 0 8px 0', color: 'var(--primary-color)' }}>
          {isOng ? 'Solicitar Doação' : 'Desapegar (Anunciar)'}
        </h2>

        <p style={{ color: '#666', margin: '0 0 22px 0', lineHeight: '1.5' }}>
          {isOng
            ? 'Descreva o que sua instituição precisa para que doadores possam ajudar.'
            : 'Conte um pouco sobre o item que você quer doar.'}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Título</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder={isOng ? 'Ex: Cestas básicas para famílias' : 'Ex: Sofá de 3 lugares'}
              required
            />
          </div>

          <div className="form-group">
            <label>Categoria</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">Selecione uma categoria...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {!isOng && (
            <div className="form-group">
              <label>Condição</label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleChange}
              >
                <option value="Novo">Novo</option>
                <option value="Usado - Bom estado">Usado - Bom estado</option>
                <option value="Usado - Precisa de reparo">Usado - Precisa de reparo</option>
              </select>
            </div>
          )}

          {isOng && (
            <>
              <div className="form-group">
                <label>Meta (quantidade necessária)</label>
                <input
                  type="number"
                  name="total"
                  value={formData.total}
                  onChange={handleChange}
                  min="1"
                  step="1"
                  placeholder="Ex: 50"
                  required
                />
              </div>

              <div className="form-group">
                <label>Motivo do Pedido</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Explique por que sua instituição precisa desses itens..."
                  style={{ resize: 'none' }}
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Foto</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-submit"
            disabled={loading}
            style={{ marginTop: '10px' }}
          >
            {loading ? 'Publicando...' : 'Publicar'}
          </button>
        </form>
      </div>
    </div>
  );
}