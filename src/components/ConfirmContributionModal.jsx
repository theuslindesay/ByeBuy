import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ConfirmContributionModal({
  isOpen,
  onClose,
  item,
  currentUser,
  onConfirmed
}) {
  const [step, setStep] = useState('form');
  const [possibleDonors, setPossibleDonors] = useState([]);
  const [selectedDonorId, setSelectedDonorId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [thankYouNote, setThankYouNote] = useState('');
  const [communityMessage, setCommunityMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDonors, setLoadingDonors] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (isOpen && item && currentUser) {
      loadPossibleDonors();
      setFeedback(null);
      setStep('form');
      setCommunityMessage('');
    }
  }, [isOpen, item, currentUser]);

  if (!isOpen || !item || !currentUser) {
    return null;
  }

  const isOngOwner = currentUser.id === item.owner_uid;

  if (!isOngOwner) {
    return null;
  }

  const resetForm = () => {
    setSelectedDonorId('');
    setQuantity('');
    setThankYouNote('');
    setCommunityMessage('');
    setFeedback(null);
    setStep('form');
  };

  const loadPossibleDonors = async () => {
    setLoadingDonors(true);

    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('sender_id, receiver_id')
      .eq('item_id', item.id)
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('Erro ao buscar mensagens:', messagesError.message);
      setLoadingDonors(false);
      return;
    }

    const donorIds = new Set();

    (messagesData || []).forEach(function (msg) {
      if (msg.sender_id && msg.sender_id !== currentUser.id) {
        donorIds.add(msg.sender_id);
      }

      if (msg.receiver_id && msg.receiver_id !== currentUser.id) {
        donorIds.add(msg.receiver_id);
      }
    });

    const donorIdList = Array.from(donorIds);

    if (donorIdList.length === 0) {
      setPossibleDonors([]);
      setLoadingDonors(false);
      return;
    }

    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name, bairro, type')
      .in('id', donorIdList);

    if (usersError) {
      console.error('Erro ao buscar usuários:', usersError.message);
      setLoadingDonors(false);
      return;
    }

    const onlyDonors = (usersData || []).filter(function (user) {
      return user.id !== currentUser.id;
    });

    setPossibleDonors(onlyDonors);
    setLoadingDonors(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedDonorId) {
      setFeedback({ type: 'error', message: 'Selecione quem fez a contribuição.' });
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      setFeedback({ type: 'error', message: 'Informe uma quantidade válida.' });
      return;
    }

    const parsedQuantity = parseInt(quantity, 10);
    const remaining = (item.total_needed || 0) - (item.current_amount || 0);

    // Trava para não ultrapassar o limite da meta
    if (parsedQuantity > remaining) {
      setFeedback({ 
        type: 'error', 
        message: `Atenção: Faltam apenas ${remaining} itens para bater a meta deste pedido.` 
      });
      return;
    }

    setLoading(true);

    const payload = {
      item_id: item.id,
      donor_id: selectedDonorId,
      ong_id: currentUser.id,
      quantity: parsedQuantity,
      status: 'confirmed',
      thank_you_note: thankYouNote || null,
      confirmed_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('contributions')
      .insert([payload]);

    if (error) {
      setLoading(false);
      setFeedback({ type: 'error', message: 'Erro ao confirmar contribuição: ' + error.message });
      return;
    }

    const newCurrentAmount = (item.current_amount || 0) + parsedQuantity;
    const totalNeeded = item.total_needed || 0;
    const newStatus =
      item.type === 'need' && totalNeeded > 0 && newCurrentAmount >= totalNeeded
        ? 'completed'
        : item.status || 'active';

    const { error: itemUpdateError } = await supabase
      .from('items')
      .update({
        current_amount: newCurrentAmount,
        status: newStatus
      })
      .eq('id', item.id);

    setLoading(false);

    if (itemUpdateError) {
      setFeedback({ type: 'error', message: 'Contribuição salva, mas erro ao atualizar o pedido: ' + itemUpdateError.message });
      setTimeout(() => {
        if (onConfirmed) onConfirmed();
        onClose();
        resetForm();
      }, 3000);
      return;
    }

    if (newStatus === 'completed') {
      // Se bateu a meta, avança para a tela de agradecimento!
      setStep('success');
    } else {
      setFeedback({ type: 'success', message: 'Contribuição registrada com sucesso!' });
      setTimeout(() => {
        if (onConfirmed) onConfirmed();
        onClose();
        resetForm();
      }, 2000);
    }
  };

  const handlePostToCommunity = async () => {
    if (!communityMessage.trim()) {
      if (onConfirmed) onConfirmed();
      onClose();
      resetForm();
      return;
    }

    setLoading(true);

    await supabase.from('community_posts').insert([{
      author_id: currentUser.id,
      content: communityMessage.trim(),
      type: 'agradecimento'
    }]);

    setLoading(false);
    
    if (onConfirmed) onConfirmed();
    onClose();
    resetForm();
  };

  if (step === 'success') {
    return (
      <div className="modal">
        <div className="modal-content" style={{ maxWidth: '560px', padding: '30px', textAlign: 'center', borderRadius: '22px' }}>
          <div style={{ fontSize: '4.5rem', marginBottom: '10px' }}>🎉</div>
          
          <h2 style={{ color: '#a8bf7c', marginBottom: '15px', fontSize: '1.8rem' }}>Meta Atingida!</h2>
          
          <p style={{ color: '#555', marginBottom: '25px', lineHeight: '1.6', fontSize: '1.05rem' }}>
            Parabéns! O pedido <strong>{item.title}</strong> foi totalmente atendido e retirado automaticamente do Mural Solidário.
          </p>
          
          <div style={{ textAlign: 'left', marginBottom: '25px', background: '#f8faf5', padding: '20px', borderRadius: '16px', border: '1px solid #eef4e6' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold', color: '#6a8c3a' }}>
              Deixe um post de agradecimento na Comunidade:
            </label>
            <textarea
              rows={4}
              value={communityMessage}
              onChange={(e) => setCommunityMessage(e.target.value)}
              placeholder="Ex.: Muito obrigado a todos que ajudaram a bater nossa meta! Essa doação fará toda a diferença..."
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #dcedc8', outline: 'none' }}
            />
          </div>

          <button
            className="btn-submit"
            onClick={handlePostToCommunity}
            disabled={loading}
            style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#a8bf7c', fontSize: '1.1rem' }}
          >
            {loading ? 'Publicando...' : 'Publicar Agradecimento e Encerrar'}
          </button>
          
          <button
            onClick={() => {
              if (onConfirmed) onConfirmed();
              onClose();
              resetForm();
            }}
            style={{ background: 'transparent', border: 'none', color: '#999', marginTop: '18px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem' }}
          >
            Pular e voltar ao Mural
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal">
      <div
        className="modal-content"
        style={{
          maxWidth: '560px',
          padding: '24px',
          borderRadius: '20px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>Confirmar contribuição</h2>
          <button
            className="close-modal"
            onClick={() => {
              resetForm();
              onClose();
            }}
            style={{
              position: 'static',
              fontSize: '1.5rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        <p style={{ marginBottom: '16px', color: '#555' }}>
          Pedido: <strong>{item.title}</strong>
        </p>

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
              fontSize: '0.95rem'
            }}
          >
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Quem ajudou neste pedido?</label>

            {loadingDonors ? (
              <p>Carregando interessados...</p>
            ) : possibleDonors.length === 0 ? (
              <div
                style={{
                  background: '#fafafa',
                  border: '1px solid #eee',
                  borderRadius: '12px',
                  padding: '14px',
                  color: '#777'
                }}
              >
                Nenhum usuário conversou sobre este pedido ainda.
              </div>
            ) : (
              <select
                value={selectedDonorId}
                onChange={(e) => setSelectedDonorId(e.target.value)}
              >
                <option value="">Selecione um usuário</option>
                {possibleDonors.map(function (user) {
                  return (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.bairro || 'Sem bairro'}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          <div className="form-group">
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => {
                // A mesma trava de segurança aqui para não bagunçar o banco
                if (e.target.value < 1 && e.target.value !== '') return;
                setQuantity(e.target.value);
              }}
              placeholder="Ex.: 5"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>

          <div className="form-group">
            <label>Mensagem para o doador (opcional)</label>
            <textarea
              rows={3}
              value={thankYouNote}
              onChange={(e) => setThankYouNote(e.target.value)}
              placeholder="Ex.: Sua doação foi essencial para atender esse pedido. Obrigado!"
              style={{ resize: 'none', width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            className="btn-submit"
            disabled={loading || loadingDonors || possibleDonors.length === 0}
            style={{ marginTop: '10px' }}
          >
            {loading ? 'Processando...' : 'Confirmar contribuição'}
          </button>
        </form>
      </div>
    </div>
  );
}