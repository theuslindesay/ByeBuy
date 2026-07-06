import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../supabaseClient';

export default function ChatModal({ isOpen, onClose, currentUser, item }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const messagesEndRef = useRef(null);

  const generateAvatarFallback = (name) => {
    const safeName = name && name.trim() ? name.trim() : 'U';
    const initial = safeName.charAt(0).toUpperCase();

    const colors = [
      '#7DA4C7',
      '#a4be74',
      '#c78da4',
      '#8f9bd1',
      '#d1a76f',
      '#6fb8b1'
    ];

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

  const resolveConversationPartnerId = useMemo(() => {
    if (!item || !currentUser) {
      return null;
    }

    if (currentUser.id !== item.owner_uid) {
      return item.owner_uid;
    }

    if (item.chatPartnerId) {
      return item.chatPartnerId;
    }

    if (item.receiver_id && item.receiver_id !== currentUser.id) {
      return item.receiver_id;
    }

    const lastOtherMessage = [...messages]
      .reverse()
      .find(function (msg) {
        return msg.sender_id !== currentUser.id;
      });

    if (lastOtherMessage) {
      return lastOtherMessage.sender_id;
    }

    return null;
  }, [item, currentUser, messages]);

  const receiverName = useMemo(() => {
    if (!item || !currentUser) {
      return 'Contato';
    }

    if (currentUser.id !== item.owner_uid) {
      if (item?.users?.name) {
        return item.users.name;
      }

      return 'ONG';
    }

    if (item.chatPartnerName) {
      return item.chatPartnerName;
    }

    const lastOtherMessage = [...messages]
      .reverse()
      .find(function (msg) {
        return msg.sender_id !== currentUser.id;
      });

    if (lastOtherMessage && lastOtherMessage.sender_name) {
      return lastOtherMessage.sender_name;
    }

    return 'Interessado';
  }, [item, currentUser, messages]);

  const receiverAvatar = useMemo(() => {
    if (!item || !currentUser) {
      return generateAvatarFallback('Contato');
    }

    if (currentUser.id !== item.owner_uid) {
      if (item?.users?.avatar) {
        return item.users.avatar;
      }

      return generateAvatarFallback(receiverName);
    }

    if (item.chatPartnerAvatar) {
      return item.chatPartnerAvatar;
    }

    return generateAvatarFallback(receiverName);
  }, [item, currentUser, receiverName]);

  useEffect(() => {
    if (!isOpen || !item || !currentUser) {
      return;
    }

    loadMessages();
    setFeedback(null);

    const channel = supabase
      .channel(`chat-${item.id}-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `item_id=eq.${item.id}`
        },
        (payload) => {
          const newMsg = payload.new;

          const belongsToCurrentConversation =
            (newMsg.sender_id === currentUser.id && newMsg.receiver_id === resolveConversationPartnerId) ||
            (newMsg.receiver_id === currentUser.id && newMsg.sender_id === resolveConversationPartnerId) ||
            (currentUser.id !== item.owner_uid &&
              ((newMsg.sender_id === currentUser.id && newMsg.receiver_id === item.owner_uid) ||
                (newMsg.sender_id === item.owner_uid && newMsg.receiver_id === currentUser.id)));

          if (!belongsToCurrentConversation) {
            return;
          }

          setMessages((prev) => {
            const alreadyExists = prev.some(function (msg) {
              return msg.id === newMsg.id;
            });

            if (alreadyExists) {
              return prev;
            }

            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, item, currentUser, resolveConversationPartnerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, imagePreview, feedback]);

  const loadMessages = async () => {
    if (!item || !currentUser) {
      return;
    }

    setLoading(true);

    let query = supabase
      .from('messages')
      .select('*')
      .eq('item_id', item.id)
      .order('created_at', { ascending: true });

    const partnerId =
      currentUser.id === item.owner_uid
        ? item.chatPartnerId || item.receiver_id || null
        : item.owner_uid;

    if (partnerId) {
      query = query.or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUser.id})`
      );
    } else if (currentUser.id !== item.owner_uid) {
      query = query.or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${item.owner_uid}),and(sender_id.eq.${item.owner_uid},receiver_id.eq.${currentUser.id})`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao carregar mensagens:', error.message);
    }

    if (!error && data) {
      setMessages(data);
    }

    setLoading(false);
  };

  const resolveReceiverId = () => {
    if (!item || !currentUser) {
      return null;
    }

    if (currentUser.id !== item.owner_uid) {
      return item.owner_uid;
    }

    if (item.chatPartnerId) {
      return item.chatPartnerId;
    }

    if (item.receiver_id && item.receiver_id !== currentUser.id) {
      return item.receiver_id;
    }

    const lastReceivedMessage = [...messages]
      .reverse()
      .find(function (msg) {
        return msg.sender_id !== currentUser.id;
      });

    if (lastReceivedMessage) {
      return lastReceivedMessage.sender_id;
    }

    return null;
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!newMessage.trim() && !imageFile) {
      return;
    }

    const receiverId = resolveReceiverId();

    if (!receiverId) {
      setFeedback({ type: 'error', message: 'Não foi possível identificar o destinatário desta conversa.' });
      return;
    }

    setSending(true);

    let uploadedImageUrl = null;

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const filePath = `${currentUser.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(filePath, imageFile);

      if (!uploadError) {
        const { data } = supabase.storage
          .from('chat-images')
          .getPublicUrl(filePath);

        uploadedImageUrl = data.publicUrl;
      } else {
        console.error('Erro no upload da imagem:', uploadError.message);
      }
    }

    const msgData = {
      item_id: item.id,
      sender_id: currentUser.id,
      receiver_id: receiverId,
      content: newMessage.trim() || '',
      image_url: uploadedImageUrl
    };

    const { error } = await supabase
      .from('messages')
      .insert([msgData]);

    setSending(false);

    if (error) {
      setFeedback({ type: 'error', message: 'Erro ao enviar mensagem: ' + error.message });
    } else {
      setNewMessage('');
      clearImage();
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) {
      return '';
    }

    const date = new Date(dateString);

    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen || !item) {
    return null;
  }

  return (
    <div className="modal">
      <div
        className="modal-content"
        style={{
          maxWidth: '620px',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '22px'
        }}
      >
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src={receiverAvatar}
              alt={receiverName}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--primary-color)',
                background: '#f0f4f8'
              }}
            />

            <div>
              <div
                style={{
                  fontWeight: '700',
                  color: 'var(--primary-color)',
                  fontSize: '1rem'
                }}
              >
                {receiverName}
              </div>

              <div
                style={{
                  fontSize: '0.9rem',
                  color: '#666'
                }}
              >
                Conversa sobre: {item.title}
              </div>

              {item.item_code && (
                <div
                  style={{
                    fontSize: '0.85rem',
                    color: '#999',
                    marginTop: '3px'
                  }}
                >
                  Código: {item.item_code}
                </div>
              )}
            </div>
          </div>

          <button
            className="close-modal"
            onClick={onClose}
            style={{
              position: 'static',
              fontSize: '1.6rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        {feedback && (
          <div
            style={{
              padding: '10px 16px',
              background: feedback.type === 'error' ? '#fff3f3' : '#f1f7ea',
              color: feedback.type === 'error' ? '#d96b6b' : '#6a8c3a',
              borderBottom: `1px solid ${feedback.type === 'error' ? '#fcdede' : '#dcedc8'}`,
              fontWeight: '500',
              fontSize: '0.9rem',
              textAlign: 'center'
            }}
          >
            {feedback.message}
          </div>
        )}

        <div
          style={{
            background: '#f7f9fc',
            padding: '20px',
            height: '380px',
            overflowY: 'auto'
          }}
        >
          {loading ? (
            <p style={{ color: '#666' }}>Carregando mensagens...</p>
          ) : messages.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: '#777',
                marginTop: '90px'
              }}
            >
              <p style={{ marginBottom: '8px', fontWeight: '700', color: 'var(--primary-color)' }}>
                Nenhuma mensagem ainda.
              </p>
              <p>Diga olá e comece a conversa.</p>
            </div>
          ) : (
            messages.map(function (msg) {
              const isMine = msg.sender_id === currentUser.id;

              return (
                <div
                  key={msg.id}
                  className={`msg-row ${isMine ? 'sent' : 'received'}`}
                >
                  <div>
                    <div
                      className="message-bubble"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      {msg.image_url && (
                        <img
                          src={msg.image_url}
                          alt="Anexo"
                          style={{
                            maxWidth: '100%',
                            borderRadius: '8px',
                            maxHeight: '200px',
                            objectFit: 'cover'
                          }}
                        />
                      )}

                      {msg.content && <span>{msg.content}</span>}
                    </div>

                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#999',
                        marginTop: '4px',
                        textAlign: isMine ? 'right' : 'left'
                      }}
                    >
                      {formatTime(msg.created_at)}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div ref={messagesEndRef}></div>
        </div>

        {imagePreview && (
          <div
            style={{
              padding: '10px 18px',
              background: '#eef4fb',
              borderTop: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <img
              src={imagePreview}
              alt="Preview"
              style={{
                height: '50px',
                borderRadius: '6px'
              }}
            />

            <button
              onClick={clearImage}
              style={{
                background: '#df6b6b',
                color: '#fff',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              Remover foto
            </button>
          </div>
        )}

        <form
          onSubmit={handleSendMessage}
          style={{
            display: 'flex',
            gap: '12px',
            padding: '18px',
            borderTop: '1px solid #eee',
            background: '#fff',
            alignItems: 'center'
          }}
        >
          <label
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '42px',
              height: '42px',
              background: '#f0f4f8',
              borderRadius: '50%',
              color: 'var(--primary-color)',
              fontSize: '1.2rem',
              flexShrink: 0
            }}
          >
            📷
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
          </label>

          <input
            type="text"
            placeholder="Digite sua mensagem (opcional se enviar foto)..."
            value={newMessage}
            onChange={function (e) {
              setNewMessage(e.target.value);
            }}
            style={{
              flex: 1,
              padding: '14px 16px',
              borderRadius: '12px',
              border: '1px solid #ddd',
              outline: 'none'
            }}
          />

          <button
            type="submit"
            className="btn-submit"
            disabled={sending}
            style={{
              width: 'auto',
              marginTop: 0,
              padding: '0 22px',
              borderRadius: '12px',
              height: '46px'
            }}
          >
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
      </div>
    </div>
  );
}