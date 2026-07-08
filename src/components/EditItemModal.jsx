import { useState, useEffect } from 'react';
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

export default function EditItemModal({ isOpen, onClose, item, onUpdated }) {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    condition: 'Novo',
    total: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setFormData({
        title: item.title || '',
        category: item.category || '',
        condition: item.condition || 'Novo',
        total: item.total_needed != null ? String(item.total_needed) : '',
        reason: item.reason || ''
      });
    } else if (!isOpen) {
      setFormData({
        title: '',
        category: '',
        condition: 'Novo',
        total: '',
        reason: ''
      });
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const isOng = item.type === 'need';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClose = () => {
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
      const updateData = {
        title: formData.title.trim(),
        category: formData.category,
        condition: isOng ? null : formData.condition,
        total_needed: isOng ? parsedTotal : null,
        reason: isOng ? formData.reason.trim() : null
      };

      const { error } = await supabase
        .from('items')
        .update(updateData)
        .eq('id', item.id);

      if (error) {
        alert('Erro ao atualizar: ' + error.message);
        return;
      }

      if (onUpdated) onUpdated();
      onClose();
    } catch (error) {
      alert('Ocorreu um erro ao atualizar o item. Tente novamente.');
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
          Editar Publicação
        </h2>

        <p style={{ color: '#666', margin: '0 0 22px 0', lineHeight: '1.5' }}>
          {isOng
            ? 'Atualize as informações do pedido da sua instituição.'
            : 'Atualize as informações do item que você está doando.'}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Título</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
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

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn-outline"
              onClick={handleClose}
              disabled={loading}
              style={{ flex: 1, padding: '12px' }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
              style={{ flex: 1, padding: '12px', marginTop: 0 }}
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}