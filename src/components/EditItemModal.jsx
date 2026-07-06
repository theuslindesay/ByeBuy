import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function EditItemModal({ isOpen, item, onClose, onUpdated }) {
  const [formData, setFormData] = useState({
    title: item && item.title ? item.title : '',
    category: item && item.category ? item.category : '',
    condition: item && item.condition ? item.condition : '',
    total_needed: item && item.total_needed ? item.total_needed : '',
    reason: item && item.reason ? item.reason : ''
  });

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!isOpen || !item) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const updates = {
      title: formData.title,
      category: formData.category,
      condition: item.type === 'donation' ? formData.condition : null,
      total_needed: item.type === 'need' ? parseInt(formData.total_needed) : null,
      reason: item.type === 'need' ? formData.reason : null
    };

    const { error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', item.id);

    setLoading(false);

    if (error) {
      setFeedback({ type: 'error', message: 'Erro ao atualizar: ' + error.message });
    } else {
      setFeedback({ type: 'success', message: 'Item atualizado com sucesso!' });
      
      setTimeout(() => {
        setFeedback(null);
        onUpdated();
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <span className="close-modal" onClick={onClose}>&times;</span>

        <h2>Editar item</h2>

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
                setFormData({ ...formData, title: e.target.value });
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
                setFormData({ ...formData, category: e.target.value });
              }}
              required
            />
          </div>

          {item.type === 'donation' && (
            <div className="form-group">
              <label>Condição</label>
              <select
                value={formData.condition}
                onChange={function (e) {
                  setFormData({ ...formData, condition: e.target.value });
                }}
              >
                <option value="Novo">Novo</option>
                <option value="Usado">Usado</option>
              </select>
            </div>
          )}

          {item.type === 'need' && (
            <div>
              <div className="form-group">
                <label>Meta total</label>
                <input
                  type="number"
                  value={formData.total_needed}
                  onChange={function (e) {
                    setFormData({ ...formData, total_needed: e.target.value });
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label>Motivo do pedido</label>
                <textarea
                  value={formData.reason}
                  onChange={function (e) {
                    setFormData({ ...formData, reason: e.target.value });
                  }}
                ></textarea>
              </div>
            </div>
          )}

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </div>
    </div>
  );
}