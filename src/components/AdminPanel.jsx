import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminPanel({ currentUser }) {
  const [activeTab, setActiveTab] = useState('ongs');
  const [ongs, setOngs] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchOng, setSearchOng] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOng, setSelectedOng] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [savingAction, setSavingAction] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [dialogConfig, setDialogConfig] = useState(null);

  useEffect(() => {
    if (currentUser?.type === 'Admin') {
      loadAdminData();
    }
  }, [currentUser]);

  const loadAdminData = async () => {
    setLoading(true);

    const { data: ongData, error: ongError } = await supabase
      .from('users')
      .select('*')
      .eq('type', 'ONG')
      .order('created_at', { ascending: false });

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .in('type', ['Doador', 'Admin'])
      .order('created_at', { ascending: false });

    if (ongError) {
      console.error('Erro ao carregar ONGs:', ongError.message);
    }

    if (userError) {
      console.error('Erro ao carregar utilizadores:', userError.message);
    }

    setOngs(ongData || []);
    setUsers(userData || []);
    setLoading(false);
  };

  const filteredOngs = useMemo(() => {
    const term = (searchOng || '').toLowerCase().trim();

    return ongs.filter((ong) => {
      return (
        (ong.name || '').toLowerCase().includes(term) ||
        (ong.email || '').toLowerCase().includes(term) ||
        (ong.bairro || '').toLowerCase().includes(term) ||
        (ong.cnpj || '').toLowerCase().includes(term) ||
        (ong.ong_type || '').toLowerCase().includes(term)
      );
    });
  }, [ongs, searchOng]);

  const filteredUsers = useMemo(() => {
    const term = (searchUser || '').toLowerCase().trim();

    return users.filter((user) => {
      return (
        (user.name || '').toLowerCase().includes(term) ||
        (user.email || '').toLowerCase().includes(term) ||
        (user.bairro || '').toLowerCase().includes(term) ||
        (user.type || '').toLowerCase().includes(term)
      );
    });
  }, [users, searchUser]);

  const getStatusConfig = (status) => {
    if (status === 'approved') {
      return { label: 'ATIVA', background: '#149b2e' };
    }

    if (status === 'pending') {
      return { label: 'PENDENTE', background: '#f0a500' };
    }

    return { label: 'RECUSADA', background: '#d96b6b' };
  };

  const handleApprove = async () => {
    setFeedback(null);
    if (!selectedOng || !currentUser) {
      return;
    }

    setSavingAction(true);

    const { error } = await supabase
      .from('users')
      .update({
        approval_status: 'approved',
        rejection_reason: null,
        approved_at: new Date().toISOString(),
        approved_by: currentUser.id
      })
      .eq('id', selectedOng.id);

    setSavingAction(false);

    if (error) {
      setFeedback({ type: 'error', message: 'Erro ao aprovar ONG: ' + error.message });
      return;
    }

    setSelectedOng(null);
    setRejectionReason('');
    loadAdminData();
  };

  const handleReject = async () => {
    setFeedback(null);
    if (!selectedOng || !currentUser) {
      return;
    }

    if (!rejectionReason.trim()) {
      setFeedback({ type: 'error', message: 'Explique o motivo da recusa.' });
      return;
    }

    setSavingAction(true);

    const { error } = await supabase
      .from('users')
      .update({
        approval_status: 'rejected',
        rejection_reason: rejectionReason.trim(),
        approved_at: null,
        approved_by: currentUser.id
      })
      .eq('id', selectedOng.id);

    setSavingAction(false);

    if (error) {
      setFeedback({ type: 'error', message: 'Erro ao recusar ONG: ' + error.message });
      return;
    }

    setSelectedOng(null);
    setRejectionReason('');
    loadAdminData();
  };

  const requestDeleteUser = (userId, userName) => {
    setDialogConfig({
      title: 'Excluir Utilizador',
      message: `Deseja realmente excluir "${userName}"? Todos os dados vinculados a esta conta serão removidos.`,
      onConfirm: () => executeDeleteUser(userId),
      onCancel: () => setDialogConfig(null)
    });
  };

  const executeDeleteUser = async (userId) => {
    setDialogConfig(null);

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      setDialogConfig({
        title: 'Erro ao excluir',
        message: error.message,
        isAlert: true,
        onConfirm: () => setDialogConfig(null)
      });
      return;
    }

    loadAdminData();
  };

  const openAnalysisModal = (ong) => {
    setSelectedOng(ong);
    setRejectionReason(ong.rejection_reason || '');
    setFeedback(null);
  };

  const closeModal = () => {
    setSelectedOng(null);
    setRejectionReason('');
    setFeedback(null);
  };

  if (!currentUser || currentUser.type !== 'Admin') {
    return (
      <section style={{ padding: '30px 40px' }}>
        <div
          style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
          }}
        >
          <h2 style={{ marginBottom: '10px' }}>Acesso negado</h2>
          <p style={{ color: '#666' }}>
            Apenas administradores podem acessar este painel.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section style={{ padding: '30px 40px 50px' }}>
      
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
          borderRadius: '28px',
          padding: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
        }}
      >
        <h2 style={{ fontSize: '2rem', marginBottom: '24px' }}>
          Painel Administrativo
        </h2>

        <div
          style={{
            display: 'flex',
            gap: '24px',
            borderBottom: '1px solid #e8e8e8',
            marginBottom: '24px'
          }}
        >
          <button
            className="btn-nav"
            onClick={() => setActiveTab('ongs')}
            style={{
              padding: '10px 0 14px',
              borderBottom: activeTab === 'ongs' ? '3px solid #8aa8c4' : '3px solid transparent',
              borderRadius: 0,
              color: activeTab === 'ongs' ? '#7da4c7' : '#666',
              fontWeight: activeTab === 'ongs' ? '700' : '500'
            }}
          >
            Gerenciar ONGs
          </button>

          <button
            className="btn-nav"
            onClick={() => setActiveTab('users')}
            style={{
              padding: '10px 0 14px',
              borderBottom: activeTab === 'users' ? '3px solid #8aa8c4' : '3px solid transparent',
              borderRadius: 0,
              color: activeTab === 'users' ? '#7da4c7' : '#666',
              fontWeight: activeTab === 'users' ? '700' : '500'
            }}
          >
            Gerenciar Utilizadores
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#666' }}>Carregando painel...</p>
        ) : activeTab === 'ongs' ? (
          <>
            <input
              type="text"
              placeholder="Buscar ONG..."
              value={searchOng}
              onChange={(e) => setSearchOng(e.target.value)}
              style={{
                width: '100%',
                marginBottom: '18px',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid #ddd'
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredOngs.length === 0 ? (
                <div
                  style={{
                    border: '1px solid #ececec',
                    borderRadius: '16px',
                    padding: '20px',
                    color: '#777'
                  }}
                >
                  Nenhuma ONG encontrada.
                </div>
              ) : (
                filteredOngs.map((ong) => {
                  const statusConfig = getStatusConfig(ong.approval_status);

                  return (
                    <div
                      key={ong.id}
                      style={{
                        border: '1px solid #ececec',
                        borderRadius: '16px',
                        padding: '18px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '16px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                        <img
                          src={ong.avatar || 'https://via.placeholder.com/60'}
                          alt={ong.name}
                          style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            background: '#f1f1f1'
                          }}
                        />

                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              flexWrap: 'wrap',
                              marginBottom: '6px'
                            }}
                          >
                            <strong style={{ color: '#7da4c7', fontSize: '1.1rem' }}>
                              {ong.name}
                            </strong>

                            <span
                              style={{
                                background: '#8aa8c4',
                                color: '#fff',
                                borderRadius: '999px',
                                padding: '3px 10px',
                                fontSize: '0.75rem'
                              }}
                            >
                              ONG
                            </span>

                            <span
                              style={{
                                background: statusConfig.background,
                                color: '#fff',
                                borderRadius: '999px',
                                padding: '3px 10px',
                                fontSize: '0.75rem'
                              }}
                            >
                              {statusConfig.label}
                            </span>
                          </div>

                          <p style={{ margin: 0, color: '#666', lineHeight: '1.5' }}>
                            {ong.email} | {ong.bairro || 'Sem bairro'}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {ong.approval_status !== 'approved' && (
                          <button
                            className="btn-nav"
                            style={{
                              background: '#8aa8c4',
                              color: '#fff',
                              borderRadius: '10px',
                              padding: '10px 14px'
                            }}
                            onClick={() => openAnalysisModal(ong)}
                          >
                            {ong.approval_status === 'pending'
                              ? '📄 Analisar Solicitação'
                              : '📄 Reavaliar Recusa'}
                          </button>
                        )}

                        <button
                          className="btn-nav"
                          style={{
                            background: '#df6b6b',
                            color: '#fff',
                            borderRadius: '10px',
                            padding: '10px 14px'
                          }}
                          onClick={() => requestDeleteUser(ong.id, ong.name)}
                        >
                          🗑 Excluir
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Buscar utilizador..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              style={{
                width: '100%',
                marginBottom: '18px',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid #ddd'
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredUsers.length === 0 ? (
                <div
                  style={{
                    border: '1px solid #ececec',
                    borderRadius: '16px',
                    padding: '20px',
                    color: '#777'
                  }}
                >
                  Nenhum utilizador encontrado.
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    style={{
                      border: '1px solid #ececec',
                      borderRadius: '16px',
                      padding: '18px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                      <img
                        src={user.avatar || 'https://via.placeholder.com/60'}
                        alt={user.name}
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          background: '#f1f1f1'
                        }}
                      />

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                            marginBottom: '6px'
                          }}
                        >
                          <strong style={{ color: '#7da4c7', fontSize: '1.1rem' }}>
                            {user.name}
                          </strong>

                          <span
                            style={{
                              background: user.type === 'Admin' ? '#f0a500' : '#a8bf7c',
                              color: '#fff',
                              borderRadius: '999px',
                              padding: '3px 10px',
                              fontSize: '0.75rem'
                            }}
                          >
                            {user.type}
                          </span>
                        </div>

                        <p style={{ margin: 0, color: '#666', lineHeight: '1.5' }}>
                          {user.email} | {user.bairro || 'Sem bairro'}
                        </p>
                      </div>
                    </div>

                    <button
                      className="btn-nav"
                      style={{
                        background: '#df6b6b',
                        color: '#fff',
                        borderRadius: '10px',
                        padding: '10px 14px'
                      }}
                      onClick={() => requestDeleteUser(user.id, user.name)}
                    >
                      🗑 Excluir
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {selectedOng && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '620px' }}>
            <button className="close-modal" onClick={closeModal}>
              ×
            </button>

            <h2 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>
              Analisar Solicitação
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
                  fontSize: '0.95rem'
                }}
              >
                {feedback.message}
              </div>
            )}

            <div
              style={{
                background: '#f7f7f7',
                borderRadius: '18px',
                padding: '16px',
                marginBottom: '18px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img
                  src={selectedOng.avatar || 'https://via.placeholder.com/70'}
                  alt={selectedOng.name}
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />

                <div>
                  <h3 style={{ margin: 0 }}>{selectedOng.name}</h3>
                  <p style={{ margin: '4px 0 0 0', color: '#666' }}>
                    CNPJ: {selectedOng.cnpj || 'Não informado'} | {selectedOng.ong_type || 'Sem tipo'}
                  </p>
                </div>
              </div>
            </div>

            <p><strong>Localização:</strong> {selectedOng.bairro || 'Não informada'}</p>
            <p><strong>E-mail:</strong> {selectedOng.email}</p>
            <p><strong>Telefone:</strong> {selectedOng.phone || 'Não informado'}</p>
            <p><strong>Site/Rede:</strong> {selectedOng.website || 'Não informado'}</p>

            <div
              style={{
                marginTop: '14px',
                marginBottom: '18px',
                background: '#eef4fb',
                borderRadius: '14px',
                padding: '16px'
              }}
            >
              <strong>Missão / Descrição:</strong>
              <p style={{ marginTop: '8px', color: '#444', whiteSpace: 'pre-wrap' }}>
                {selectedOng.mission || 'Sem descrição informada.'}
              </p>
            </div>

            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Motivo da recusa
            </label>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows="4"
              placeholder="Explique o motivo caso a ONG seja recusada..."
              style={{
                width: '100%',
                border: '1px solid #ddd',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '18px'
              }}
            />

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <button
                className="btn-submit"
                style={{
                  flex: 1,
                  minWidth: '200px',
                  background: '#a8bf7c'
                }}
                disabled={savingAction}
                onClick={handleApprove}
              >
                {savingAction ? 'Salvando...' : '✅ Aprovar Cadastro'}
              </button>

              <button
                className="btn-submit"
                style={{
                  flex: 1,
                  minWidth: '200px',
                  background: '#df6b6b'
                }}
                disabled={savingAction}
                onClick={handleReject}
              >
                {savingAction ? 'Salvando...' : '❌ Recusar ONG'}
              </button>
            </div>

            {selectedOng.approval_status === 'rejected' && selectedOng.rejection_reason && (
              <div
                style={{
                  marginTop: '18px',
                  padding: '14px',
                  borderRadius: '12px',
                  background: '#fff3f3',
                  color: '#a05555'
                }}
              >
                <strong>Último motivo registrado:</strong>
                <p style={{ margin: '6px 0 0 0' }}>{selectedOng.rejection_reason}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}