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
              background: '#f2f2f2',
              display: 'block'
            }}
          />

          <button
            type="button"
            className="close-modal"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.96)',
              color: '#666',
              fontSize: '1.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              boxShadow: '0 3px 12px rgba(0,0,0,0.10)',
              padding: 0
            }}
            aria-label="Fechar detalhes"
          >
            ×
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          <div
            style={{
              display: 'inline-block',
              background: item.type === 'need' ? '#e57c7c' : 'var(--primary-color)',
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

          <h2 style={{ color: 'var(--primary-color)', margin: '0 0 16px 0' }}>
            {item.title}
          </h2>

          <div
            style={{
              background: '#fafbfd',
              border: '1px solid #edf1f5',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '18px'
            }}
          >
            <p style={{ margin: '0 0 10px 0', color: '#555', lineHeight: '1.5' }}>
              <strong>ONG / Doador:</strong> {item.users?.name || 'Desconhecido'}
            </p>

            <p style={{ margin: '0 0 10px 0', color: '#555', lineHeight: '1.5' }}>
              <strong>Bairro:</strong> {item.users?.bairro || 'Não informado'}
            </p>

            <p style={{ margin: '0 0 10px 0', color: '#555', lineHeight: '1.5' }}>
              <strong>Código único:</strong> {item.item_code || 'Sem código'}
            </p>

            <p style={{ margin: 0, color: '#555', lineHeight: '1.5' }}>
              <strong>Categoria:</strong> {item.category || 'Não informada'}
            </p>
          </div>

          {item.type === 'donation' && (
            <div
              style={{
                background: '#fafbfd',
                border: '1px solid #edf1f5',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '18px'
              }}
            >
              <p style={{ margin: 0, color: '#555', lineHeight: '1.5' }}>
                <strong>Condição:</strong> {item.condition || 'Não informada'}
              </p>
            </div>
          )}

          {item.type === 'need' && (
            <>
              <div style={{ marginBottom: '10px', color: '#555', fontWeight: '700' }}>
                Motivo da solicitação
              </div>

              <div
                style={{
                  background: '#f9f9f9',
                  border: '1px solid #eee',
                  borderRadius: '14px',
                  padding: '16px',
                  marginBottom: '18px',
                  lineHeight: '1.6',
                  color: '#555',
                  whiteSpace: 'pre-wrap'
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
                    background: 'var(--primary-color)',
                    borderRadius: '999px'
                  }}
                />
              </div>

              <p style={{ margin: '0 0 22px 0', color: '#555', lineHeight: '1.5' }}>
                <strong>Arrecadado:</strong> {item.current_amount || 0} de {item.total_needed || 0}
              </p>
            </>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              className="btn-submit"
              style={{ width: 'auto', padding: '12px 22px', marginTop: 0 }}
              onClick={() => {
                onClose();
                onOpenChat(item);
              }}
            >
              Conversar agora
            </button>

            <button
              className="btn-outline"
              style={{ width: 'auto', padding: '12px 22px', marginTop: 0 }}
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