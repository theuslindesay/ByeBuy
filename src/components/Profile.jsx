import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';

export default function Profile({ currentUser, onUpdated, onLogout, onOpenChat }) {
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    bairro: currentUser?.bairro || '',
    phone: currentUser?.phone || '',
    avatar: currentUser?.avatar || ''
  });

  const [loading, setLoading] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState(currentUser?.avatar || '');

  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  const [contributions, setContributions] = useState([]);
  const [loadingContributions, setLoadingContributions] = useState(true);

  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (currentUser?.id) {
      loadConversations();
      loadContributions();
    }
  }, [currentUser]);

  if (!currentUser) {
    return <p>Faça login para ver seu perfil.</p>;
  }

  const generateAvatarFallback = (name) => {
    const safeName = name?.trim() || 'Usuário';
    const initial = safeName.charAt(0).toUpperCase();

    const colors = ['#7DA4C7', '#a4be74', '#c78da4', '#8f9bd1', '#d1a76f', '#6fb8b1'];

    let total = 0;
    for (let i = 0; i < safeName.length; i++) {
      total += safeName.charCodeAt(i);
    }

    const bgColor = colors[total % colors.length];

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <rect width="100%" height="100%" rx="100" fill="${bgColor}" />
        <text
          x="50%"
          y="54%"
          text-anchor="middle"
          fill="#ffffff"
          font-size="82"
          font-family="Nunito, Arial, sans-serif"
          font-weight="700"
        >
          ${initial}
        </text>
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  const displayAvatar = useMemo(() => {
    if (previewAvatar) {
      return previewAvatar;
    }
    return generateAvatarFallback(formData.name);
  }, [previewAvatar, formData.name]);

  const loadConversations = async () => {
    setLoadingConversations(true);

    const { data, error } = await supabase
      .from('conversation_list')
      .select('*')
      .or(`owner_uid.eq.${currentUser.id},other_user_id.eq.${currentUser.id}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar conversas:', error.message);
    }

    if (!error && data) {
      const filtered = data.filter((conv) => {
        return conv.owner_uid === currentUser.id || conv.other_user_id === currentUser.id;
      });

      setConversations(filtered);
    }

    setLoadingConversations(false);
  };

  const loadContributions = async () => {
    setLoadingContributions(true);

    const isOng = currentUser.type === 'ONG';
    const columnFilter = isOng ? 'ong_id' : 'donor_id';

    const { data, error } = await supabase
      .from('contributions')
      .select(`
        *,
        items (
          title,
          item_code,
          category,
          type
        ),
        ong:ong_id (
          name,
          bairro
        ),
        donor:donor_id (
          name,
          bairro
        )
      `)
      .eq(columnFilter, currentUser.id)
      .order('confirmed_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar contribuições:', error.message);
    }

    if (!error && data) {
      setContributions(data);
    }

    setLoadingContributions(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const result = event.target.result;
      setPreviewAvatar(result);
      setFormData({
        ...formData,
        avatar: result
      });
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const avatarToSave = formData.avatar || generateAvatarFallback(formData.name);

    const payload = {
      name: formData.name,
      bairro: formData.bairro,
      phone: formData.phone,
      avatar: avatarToSave
    };

    const { error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', currentUser.id);

    setLoading(false);

    if (error) {
      setFeedback({ type: 'error', message: 'Erro ao atualizar perfil: ' + error.message });
    } else {
      setFeedback({ type: 'success', message: 'Perfil atualizado com sucesso!' });
      setTimeout(() => {
        setFeedback(null);
        if (onUpdated) {
          onUpdated();
        }
      }, 2000);
    }
  };

  const handleOpenConversation = async (conversation) => {
    setFeedback(null);
    const { data: itemData, error } = await supabase
      .from('items')
      .select('*, users(name, bairro, avatar)')
      .eq('id', conversation.item_id)
      .single();

    if (error) {
      setFeedback({ type: 'error', message: 'Erro ao abrir conversa: ' + error.message });
      return;
    }

    if (onOpenChat) {
      onOpenChat(itemData);
    }
  };

  const handleOpenContributionChat = async (contribution) => {
    setFeedback(null);
    if (!contribution.item_id) return;

    const { data: itemData, error } = await supabase
      .from('items')
      .select('*, users(name, bairro, avatar)')
      .eq('id', contribution.item_id)
      .single();

    if (error) {
      setFeedback({ type: 'error', message: 'Erro ao abrir conversa: ' + error.message });
      return;
    }

    if (onOpenChat) {
      onOpenChat(itemData);
    }
  };

  const isOng = currentUser.type === 'ONG';

  const totalQuantity = contributions.reduce((sum, c) => sum + (c.quantity || 0), 0);

  const contributionBadge = () => {
    if (!contributions.length) {
      return null;
    }

    if (isOng) {
      return (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '999px',
            background: '#f1f7ea',
            color: '#6a8c3a',
            fontSize: '0.85rem',
            fontWeight: '600',
            marginTop: '8px'
          }}
        >
          🌱 Recebeu apoio em {contributions.length} confirmações
        </div>
      );
    }

    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '999px',
          background: '#eef3fb',
          color: '#6a85b4',
          fontSize: '0.85rem',
          fontWeight: '600',
          marginTop: '8px'
        }}
      >
        🤝 Apoiou {contributions.length} pedidos com {totalQuantity} itens
      </div>
    );
  };

  return (
    <div
      style={{
        maxWidth: '620px',
        margin: '30px auto',
        background: '#fff',
        borderRadius: '20px',
        padding: '30px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="auth-title" style={{ marginBottom: '20px', textAlign: 'left' }}>
          Meu Perfil
        </h2>

        <button
          onClick={onLogout}
          style={{
            border: 'none',
            background: 'transparent',
            fontSize: '1.4rem',
            color: '#999',
            cursor: 'pointer'
          }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img
          src={displayAvatar}
          alt="Foto de perfil"
          style={{
            width: '110px',
            height: '110px',
            objectFit: 'cover',
            borderRadius: '50%',
            border: '4px solid #7DA4C7',
            background: '#f0f4f8'
          }}
        />

        {contributionBadge()}
      </div>

      {feedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginTop: '18px',
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

      <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
        <div className="form-group">
          <label>Foto de perfil</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

        <div className="form-group">
          <label>Nome / Organização</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData({
                ...formData,
                name: e.target.value
              })
            }
            required
          />
        </div>

        <div className="form-group">
          <label>Região / Bairro</label>
          <input
            type="text"
            value={formData.bairro}
            onChange={(e) =>
              setFormData({
                ...formData,
                bairro: e.target.value
              })
            }
          />
        </div>

        <div className="form-group">
          <label>Telefone</label>
          <input
            type="text"
            value={formData.phone}
            onChange={(e) =>
              setFormData({
                ...formData,
                phone: e.target.value
              })
            }
          />
        </div>

        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>

      <div style={{ marginTop: '35px' }}>
        <h3
          style={{
            color: 'var(--primary-color)',
            marginBottom: '15px',
            borderBottom: '1px solid #eee',
            paddingBottom: '10px'
          }}
        >
          Minhas Conversas
        </h3>

        {loadingConversations ? (
          <p>Carregando conversas...</p>
        ) : conversations.length === 0 ? (
          <p>Nenhuma conversa encontrada.</p>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              style={{
                border: '1px solid #eee',
                borderRadius: '16px',
                padding: '18px',
                marginBottom: '12px',
                background: '#fafafa'
              }}
            >
              <p style={{ margin: '0 0 8px 0', color: 'var(--primary-color)', fontWeight: '700' }}>
                {conversation.item_title || 'Conversa sobre item'}
              </p>

              <p style={{ margin: '0 0 8px 0', color: '#666' }}>
                <strong>Código:</strong> {conversation.item_code || 'Sem código'}
              </p>

              <p style={{ margin: '0 0 8px 0', color: '#666' }}>
                <strong>Última mensagem:</strong> {conversation.last_message || 'Sem mensagem'}
              </p>

              <p style={{ margin: '0 0 10px 0', color: '#666' }}>
                <strong>Atualizado em:</strong>{' '}
                {conversation.last_message_at
                  ? new Date(conversation.last_message_at).toLocaleString('pt-BR')
                  : 'Sem data'}
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn-outline"
                  style={{ padding: '10px 18px', borderRadius: '10px' }}
                  onClick={() => handleOpenConversation(conversation)}
                >
                  Abrir chat
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '35px' }}>
        <h3
          style={{
            color: 'var(--primary-color)',
            marginBottom: '15px',
            borderBottom: '1px solid #eee',
            paddingBottom: '10px'
          }}
        >
          {isOng ? 'Contribuições recebidas' : 'Minhas contribuições para ONGs'}
        </h3>

        {loadingContributions ? (
          <p>Carregando contribuições...</p>
        ) : contributions.length === 0 ? (
          <p>
            {isOng
              ? 'Nenhuma contribuição registrada ainda.'
              : 'Você ainda não tem contribuições confirmadas.'}
          </p>
        ) : (
          contributions.map((c) => {
            const itemTitle = c.items?.title || 'Pedido';
            const itemCode = c.items?.item_code || 'Sem código';
            const ongName = c.ong?.name || 'ONG';
            const ongBairro = c.ong?.bairro || 'Bairro não informado';
            const donorName = c.donor?.name || 'Doador';
            const donorBairro = c.donor?.bairro || 'Bairro não informado';

            return (
              <div
                key={c.id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: '16px',
                  padding: '18px',
                  marginBottom: '12px',
                  background: '#fdfdfd'
                }}
              >
                <p style={{ margin: '0 0 6px 0', color: '#8aa8c4', fontWeight: '700' }}>
                  {itemTitle} <span style={{ color: '#999' }}>({itemCode})</span>
                </p>

                {isOng ? (
                  <p style={{ margin: '0 0 8px 0', color: '#555' }}>
                    <strong>Doador:</strong> {donorName} - {donorBairro}
                  </p>
                ) : (
                  <p style={{ margin: '0 0 8px 0', color: '#555' }}>
                    <strong>ONG beneficiada:</strong> {ongName} - {ongBairro}
                  </p>
                )}

                <p style={{ margin: '0 0 8px 0', color: '#555' }}>
                  <strong>Quantidade contribuída:</strong> {c.quantity || 0}
                </p>

                {c.thank_you_note && (
                  <p
                    style={{
                      margin: '0 0 10px 0',
                      color: '#555',
                      background: '#f7f9fc',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      fontStyle: 'italic'
                    }}
                  >
                    “{c.thank_you_note}”
                  </p>
                )}

                <p style={{ margin: '0 0 10px 0', color: '#777', fontSize: '0.9rem' }}>
                  <strong>Confirmada em:</strong>{' '}
                  {c.confirmed_at
                    ? new Date(c.confirmed_at).toLocaleString('pt-BR')
                    : new Date(c.created_at).toLocaleString('pt-BR')}
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    className="btn-outline"
                    style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.9rem' }}
                    onClick={() => handleOpenContributionChat(c)}
                  >
                    Abrir conversa
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}