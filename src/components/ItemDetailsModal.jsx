export default function ItemDetailsModal({ isOpen, onClose, item, onOpenChat }) {
  if (!isOpen || !item) {
    return null;
  }

  const progressPercent = item.total_needed
    ? Math.min(((item.current_amount || 0) / item.total_needed) * 100, 100)
    : 0;

  return (
    <div className="modal">
      <div
        className="modal-content"
        style={{
          maxWidth: '620px',
          width: '92%',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '22px'
        }}
      >
        <div style={{ position: 'relative' }}>
          <img
            src={item.image}
            alt={item.title}
            style={{
              width: '100%',
              height: '220px',
              objectFit: 'cover',
              background: '#f2f2f2'
            }}
          />

          <button
            className="close-modal"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              background: 'rgba(255,255,255,0.95)',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '22px' }}>
          <div
            style={{
              display: 'inline-block',
              background: item.type === 'need' ? '#e57c7c' : '#7DA4C7',
              color: '#fff',
              padding: '7px 14px',
              borderRadius: '999px',
              fontSize: '0.9rem',
              fontWeight: '700',
              marginBottom: '14px'
            }}
          >
            {item.type === 'need' ? 'Pedido da ONG' : 'Doação'}
          </div>

          <h2 style={{ color: 'var(--primary-color)', marginBottom: '14px' }}>
            {item.title}
          </h2>

          <p style={{ marginBottom: '10px', color: '#555' }}>
            <strong>ONG / Doador:</strong> {item.users?.name || 'Desconhecido'}
          </p>

          <p style={{ marginBottom: '10px', color: '#555' }}>
            <strong>Bairro:</strong> {item.users?.bairro || 'Não informado'}
          </p>

          <p style={{ marginBottom: '10px', color: '#555' }}>
            <strong>Código único:</strong> {item.item_code || 'Sem código'}
          </p>

          <p style={{ marginBottom: '10px', color: '#555' }}>
            <strong>Categoria:</strong> {item.category || 'Não informada'}
          </p>

          {item.type === 'need' && (
            <>
              <p style={{ marginBottom: '10px', color: '#555' }}>
                <strong>Motivo da solicitação:</strong>
              </p>

              <div
                style={{
                  background: '#f9f9f9',
                  border: '1px solid #eee',
                  borderRadius: '14px',
                  padding: '16px',
                  marginBottom: '18px',
                  lineHeight: '1.6',
                  color: '#555'
                }}
              >
                {item.reason || 'A ONG não informou uma descrição para este pedido ainda.'}
              </div>

              <div style={{ marginBottom: '10px', color: '#555', fontWeight: '700' }}>
                Progresso da arrecadação
              </div>

              <div
                style={{
                  width: '100%',
                  height: '12px',
                  background: '#eee',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  marginBottom: '10px'
                }}
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    background: '#7DA4C7',
                    borderRadius: '999px'
                  }}
                />
              </div>

              <p style={{ marginBottom: '22px', color: '#555' }}>
                <strong>Arrecadado:</strong> {item.current_amount || 0} de {item.total_needed || 0}
              </p>
            </>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              className="btn-submit"
              style={{ width: 'auto', padding: '12px 22px' }}
              onClick={() => {
                onClose();
                onOpenChat(item);
              }}
            >
              Conversar agora
            </button>

            <button
              className="btn-outline"
              style={{ width: 'auto', padding: '12px 22px' }}
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}