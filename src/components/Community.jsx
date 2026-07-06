import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Community({ currentUser, onOpenChat }) {
  const [ongs, setOngs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOngId, setSelectedOngId] = useState(null);
  const [ongItems, setOngItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    loadOngs();
  }, []);

  const loadOngs = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('type', 'ONG')
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao carregar ONGs:', error.message);
    }

    if (!error && data) {
      setOngs(data);
    }

    setLoading(false);
  };

  const handleSelectOng = async (ongId) => {
    setFeedback(null);
    setSelectedOngId(ongId);
    setLoadingItems(true);

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('owner_uid', ongId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar pedidos da ONG:', error.message);
      setOngItems([]);
    }

    if (!error && data) {
      setOngItems(data);
    }

    setLoadingItems(false);
  };

  return (
    <section style={{ padding: '30px 40px 50px' }}>
      
      {feedback && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
          <div
            style={{
              padding: '16px 24px',
              borderRadius: '12px',
              background: '#fff3f3',
              color: '#d96b6b',
              border: '1px solid #fcdede',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              fontWeight: '600',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}
          >
            {feedback.message}
            <button 
              onClick={() => setFeedback(null)} 
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#d96b6b' }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          marginBottom: '24px'
        }}
      >
        <h2 style={{ color: 'var(--primary-color)', marginBottom: '10px' }}>
          Comunidade ONGs
        </h2>

        <p style={{ color: '#666', margin: 0 }}>
          Veja as instituições cadastradas e encontre pedidos ativos para apoiar.
        </p>
      </div>

      {loading ? (
        <p>Carregando ONGs...</p>
      ) : ongs.length === 0 ? (
        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            color: '#777'
          }}
        >
          Nenhuma ONG cadastrada no momento.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 320px))',
            gap: '20px',
            justifyContent: 'start',
            marginBottom: '28px'
          }}
        >
          {ongs.map((ong) => (
            <div
              key={ong.id}
              style={{
                width: '320px',
                background: '#fff',
                borderRadius: '18px',
                padding: '20px',
                boxShadow: '0 4px 18px rgba(0,0,0,0.05)',
                border: selectedOngId === ong.id ? '2px solid #8aa8c4' : '1px solid #eee'
              }}
            >
              <h3
                style={{
                  color: '#8aa8c4',
                  marginBottom: '12px',
                  fontSize: '1.1rem'
                }}
              >
                {ong.name}
              </h3>

              <p style={{ marginBottom: '10px', color: '#555' }}>
                <strong>Bairro:</strong> {ong.bairro || 'Não informado'}
              </p>

              <p style={{ marginBottom: '18px', color: '#555' }}>
                <strong>Telefone:</strong> {ong.phone || 'Não informado'}
              </p>

              <button
                className="btn-submit"
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  padding: '12px 14px'
                }}
                onClick={() => handleSelectOng(ong.id)}
              >
                Ver pedidos ativos
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedOngId && (
        <div
          style={{
            background: '#fff',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
          }}
        >
          <h3 style={{ color: 'var(--primary-color)', marginBottom: '18px' }}>
            Pedidos ativos da ONG
          </h3>

          {loadingItems ? (
            <p>Carregando pedidos...</p>
          ) : ongItems.length === 0 ? (
            <p style={{ color: '#777' }}>Essa ONG não possui pedidos ativos no momento.</p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 320px))',
                gap: '22px',
                justifyContent: 'start'
              }}
            >
              {ongItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    width: '320px',
                    border: '1px solid #eee',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    background: '#fff',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.04)'
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

                  <div style={{ padding: '18px' }}>
                    <h4
                      style={{
                        color: '#8aa8c4',
                        marginBottom: '12px',
                        fontSize: '1.05rem',
                        lineHeight: '1.4'
                      }}
                    >
                      {item.title}
                    </h4>

                    <p style={{ marginBottom: '8px', color: '#555' }}>
                      <strong>Código:</strong> {item.item_code || 'Sem código'}
                    </p>

                    <p style={{ marginBottom: '8px', color: '#555' }}>
                      <strong>Categoria:</strong> {item.category || 'Não informada'}
                    </p>

                    {item.type === 'need' && (
                      <p style={{ marginBottom: '16px', color: '#555' }}>
                        <strong>Meta:</strong> {item.current_amount || 0} de {item.total_needed || 0}
                      </p>
                    )}

                    {item.type === 'donation' && (
                      <p style={{ marginBottom: '16px', color: '#555' }}>
                        <strong>Condição:</strong> {item.condition || 'Não informada'}
                      </p>
                    )}

                    <button
                      className="btn-outline"
                      style={{
                        width: '100%',
                        borderRadius: '12px',
                        padding: '12px 14px'
                      }}
                      onClick={() => {
                        if (!currentUser) {
                          setFeedback({ type: 'error', message: 'Faça login na plataforma para iniciar uma conversa com a ONG.' });
                          setTimeout(() => setFeedback(null), 3000);
                          return;
                        }

                        onOpenChat(item);
                      }}
                    >
                      Conversar sobre este pedido
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}