import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ItemDetailsModal from './ItemDetailsModal';
import ConfirmContributionModal from './ConfirmContributionModal';
import EditItemModal from './EditItemModal';

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

export default function Feed({ currentUser, onOpenChat, refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToConfirm, setItemToConfirm] = useState(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);

  const [dialogConfig, setDialogConfig] = useState(null);

  useEffect(() => {
    loadItems();
  }, [refreshKey]);

  const loadItems = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('items')
      .select('*, users(name, bairro, avatar)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar mural:', error.message);
    }

    if (!error && data) {
      setItems(data);
    }

    setLoading(false);
  };

  const requestDelete = (itemId) => {
    setDialogConfig({
      title: 'Excluir Publicação',
      message: 'Tem a certeza que deseja excluir esta publicação? Esta ação não pode ser desfeita.',
      onConfirm: () => executeDelete(itemId),
      onCancel: () => setDialogConfig(null)
    });
  };

  const executeDelete = async (itemId) => {
    setDialogConfig(null);

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (error) {
      setDialogConfig({
        title: 'Erro ao excluir',
        message: error.message,
        isAlert: true,
        onConfirm: () => setDialogConfig(null)
      });
    } else {
      loadItems();
    }
  };

  const normalize = (value) => {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  const filteredItems = items.filter(function (item) {
    // Nova regra: Pedidos de ONGs concluídos somem do Mural!
    if (item.type === 'need' && item.status === 'completed') {
      return false;
    }

    const normalizedSearch = normalize(searchTerm);

    const matchesSearch =
      normalizedSearch === '' ||
      normalize(item.title).includes(normalizedSearch) ||
      normalize(item.users?.name).includes(normalizedSearch) ||
      normalize(item.category).includes(normalizedSearch) ||
      normalize(item.item_code).includes(normalizedSearch);

    const matchesCategory =
      categoryFilter === 'todas' || item.category === categoryFilter;

    const matchesType =
      typeFilter === 'todos' || item.type === typeFilter;

    return matchesSearch && matchesCategory && matchesType;
  });

  const openDetails = (item) => {
    setSelectedItem(item);
    setIsDetailsOpen(true);
  };

  const closeDetails = () => {
    setSelectedItem(null);
    setIsDetailsOpen(false);
  };

  const openConfirmContribution = (item) => {
    setItemToConfirm(item);
    setIsConfirmOpen(true);
  };

  const closeConfirmContribution = () => {
    setItemToConfirm(null);
    setIsConfirmOpen(false);
  };

  const openEdit = (item) => {
    setItemToEdit(item);
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setItemToEdit(null);
    setIsEditOpen(false);
  };

  return (
    <section style={{ padding: '20px 40px 50px' }}>

      {dialogConfig && (
        <div className="modal" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '420px', padding: '30px', textAlign: 'center', borderRadius: '22px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>{dialogConfig.isAlert ? '⚠️' : '🗑️'}</div>
            <h3 style={{ color: 'var(--primary-color)', marginBottom: '15px', fontSize: '1.4rem' }}>{dialogConfig.title}</h3>
            <p style={{ color: '#555', marginBottom: '25px', lineHeight: '1.5', fontSize: '1.05rem' }}>{dialogConfig.message}</p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {!dialogConfig.isAlert && (
                <button
                  className="btn-outline"
                  onClick={dialogConfig.onCancel}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px' }}
                >
                  Cancelar
                </button>
              )}
              <button
                className="btn-submit"
                onClick={dialogConfig.onConfirm}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: dialogConfig.isAlert ? 'var(--primary-color)' : '#df6b6b', border: 'none' }}
              >
                {dialogConfig.isAlert ? 'Entendido' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '25px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
        }}
      >
        <h2 style={{ color: 'var(--primary-color)', marginBottom: '15px' }}>
          Mural Solidário
        </h2>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Buscar por item, ONG, código ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: '1',
              minWidth: '220px',
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1px solid #ddd'
            }}
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1px solid #ddd'
            }}
          >
            <option value="todas">Todas as categorias</option>
            {CATEGORIES.map(function (category) {
              return (
                <option key={category} value={category}>
                  {category}
                </option>
              );
            })}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1px solid #ddd'
            }}
          >
            <option value="todos">Todos</option>
            <option value="donation">Doações</option>
            <option value="need">Pedidos</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Carregando mural...</p>
      ) : filteredItems.length === 0 ? (
        <div
          style={{
            background: '#fff',
            borderRadius: '18px',
            padding: '30px',
            textAlign: 'center',
            color: '#777'
          }}
        >
          Nenhum item encontrado para essa busca.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 320px))',
            gap: '22px',
            justifyContent: 'start'
          }}
        >
          {filteredItems.map(function (item) {
            const isOwner = currentUser?.id === item.owner_uid;
            const isAdmin = currentUser?.type === 'Admin';
            const isCompleted = item.status === 'completed';
            const currentAmount = item.current_amount || 0;
            const totalNeeded = item.total_needed || 1;
            const progressPercent = Math.min((currentAmount / totalNeeded) * 100, 100);

            return (
              <article
                key={item.id}
                onClick={() => openDetails(item)}
                style={{
                  width: '320px',
                  background: '#fff',
                  borderRadius: '22px',
                  overflow: 'hidden',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  border: item.type === 'need' ? '1px solid #e9e2de' : '1px solid #dfe8d6'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)';
                }}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  style={{
                    width: '100%',
                    height: '210px',
                    objectFit: 'cover',
                    background: '#f2f2f2',
                    borderBottom: '1px solid #ececec'
                  }}
                />

                <div style={{ padding: '18px 20px 22px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '14px',
                      gap: '10px'
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        background: item.type === 'need' ? '#e4837f' : '#b6b6b6',
                        color: '#fff',
                        padding: '6px 14px',
                        borderRadius: '999px',
                        fontSize: '0.88rem',
                        fontWeight: '700',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {item.type === 'need'
                        ? 'Pedido de ONG'
                        : isCompleted
                        ? 'Doado 🎁'
                        : 'Doação'}
                    </div>

                    <div
                      style={{
                        background: '#f1efef',
                        color: '#666',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Cód: {item.item_code || '---'}
                    </div>
                  </div>

                  <h3
                    style={{
                      color: '#8aa8c4',
                      marginBottom: '14px',
                      fontSize: '1.05rem',
                      lineHeight: '1.35'
                    }}
                  >
                    {item.title}
                  </h3>

                  <p style={{ marginBottom: '12px', color: '#555', lineHeight: '1.5' }}>
                    <strong>{item.type === 'need' ? 'ONG' : 'Doador'}:</strong>{' '}
                    <span style={{ color: '#8aa8c4', fontWeight: '600' }}>
                      {item.users?.name || 'Desconhecido'}
                    </span>{' '}
                    - {item.users?.bairro || 'Sem bairro'}
                  </p>

                  {item.type === 'donation' && (
                    <p style={{ marginBottom: '16px', color: '#555' }}>
                      <strong>Condição:</strong> {item.condition || 'Não informada'}
                    </p>
                  )}

                  {item.type === 'need' && (
                    <>
                      <div
                        style={{
                          width: '100%',
                          height: '12px',
                          background: '#ececec',
                          borderRadius: '999px',
                          overflow: 'hidden',
                          marginBottom: '12px'
                        }}
                      >
                        <div
                          style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            background: isCompleted ? '#a8bf7c' : '#b6c98d',
                            borderRadius: '999px'
                          }}
                        />
                      </div>

                      <p style={{ marginBottom: '18px', color: '#555' }}>
                        {currentAmount} de {item.total_needed} conseguidos
                      </p>
                    </>
                  )}

                  {isCompleted && item.type === 'donation' && (
                    <p
                      style={{
                        color: '#a8bf7c',
                        fontWeight: '700',
                        marginBottom: '16px',
                        textAlign: 'center'
                      }}
                    >
                      Encerrado com Sucesso 🎉
                    </p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {!isOwner && !isCompleted && item.type === 'need' && (
                      <button
                        className="btn-submit"
                        style={{
                          width: '100%',
                          padding: '13px 16px',
                          borderRadius: '12px',
                          background: '#88a9c9',
                          border: 'none',
                          fontSize: '1rem',
                          fontWeight: '700'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenChat(item);
                        }}
                      >
                        Tenho este item! (Combinar) 🧠
                      </button>
                    )}

                    {!isOwner && item.type === 'donation' && (
                      <button
                        className="btn-outline"
                        style={{
                          width: '100%',
                          padding: '13px 16px',
                          borderRadius: '12px'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenChat(item);
                        }}
                      >
                        Ver Mensagens 📩
                      </button>
                    )}

                    {isCompleted && item.type === 'donation' && (
                      <button
                        className="btn-submit"
                        style={{
                          width: '100%',
                          padding: '13px 16px',
                          borderRadius: '12px',
                          background: '#9bb8d5',
                          border: 'none',
                          fontSize: '1rem',
                          fontWeight: '700'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenChat(item);
                        }}
                      >
                        📢 Compartilhar Resultado
                      </button>
                    )}

                    {(isOwner || isAdmin) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                        {item.type === 'need' && !isCompleted && (
                          <button
                            style={{
                              width: '100%',
                              border: 'none',
                              borderRadius: '10px',
                              padding: '12px 10px',
                              background: '#a8bf7c',
                              color: '#fff',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openConfirmContribution(item);
                            }}
                          >
                            ✅ Confirmar doador
                          </button>
                        )}

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            style={{
                              flex: 1,
                              border: 'none',
                              borderRadius: '10px',
                              padding: '10px',
                              background: '#f0ad43',
                              color: '#fff',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(item);
                            }}
                          >
                            ✏️ Editar
                          </button>

                          <button
                            style={{
                              flex: 1,
                              border: 'none',
                              borderRadius: '10px',
                              padding: '10px',
                              background: '#df6b6b',
                              color: '#fff',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              requestDelete(item.id);
                            }}
                          >
                            🗑 Excluir
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ItemDetailsModal
        isOpen={isDetailsOpen}
        onClose={closeDetails}
        item={selectedItem}
        onOpenChat={onOpenChat}
      />

      <ConfirmContributionModal
        isOpen={isConfirmOpen}
        onClose={closeConfirmContribution}
        item={itemToConfirm}
        currentUser={currentUser}
        onConfirmed={loadItems}
      />

      <EditItemModal
        isOpen={isEditOpen}
        onClose={closeEdit}
        item={itemToEdit}
        onUpdated={loadItems}
      />
    </section>
  );
}