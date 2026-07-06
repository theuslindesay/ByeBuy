import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Register({ setView }) {
  const [accountType, setAccountType] = useState('Doador');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bairroSelect, setBairroSelect] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const isOng = accountType === 'ONG';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    pass: '',
    bairro: '',
    cnpj: '',
    phone: '',
    ong_type: 'Causa Animal',
    website: '',
    mission: ''
  });

  const onlyDigits = (value) => String(value || '').replace(/\D/g, '');

  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === 'cnpj') {
      value = value.replace(/\D/g, '');
      value = value.replace(/^(\d{2})(\d)/, '$1.$2');
      value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
      value = value.replace(/(\d{4})(\d)/, '$1-$2');
      value = value.substring(0, 18);
    }

    if (name === 'phone') {
      value = value.replace(/\D/g, '');
      value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
      value = value.replace(/(\d)(\d{4})$/, '$1-$2');
      value = value.substring(0, 15);
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBairroSelect = (e) => {
    const value = e.target.value;
    setBairroSelect(value);

    if (value !== 'Outro') {
      setFormData((prev) => ({ ...prev, bairro: value }));
    } else {
      setFormData((prev) => ({ ...prev, bairro: '' }));
    }
  };

  const uploadAvatar = async (userId) => {
    if (!avatarFile) return null;

    const fileExt = avatarFile.name.split('.').pop();
    const filePath = `avatars/${userId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile);

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!formData.name.trim()) {
      setFeedback({ type: 'error', message: 'Preencha o nome completo ou nome da organização.' });
      return;
    }

    if (!formData.email.trim()) {
      setFeedback({ type: 'error', message: 'Preencha o e-mail.' });
      return;
    }

    if (formData.pass.length < 6) {
      setFeedback({ type: 'error', message: 'A senha deve ter no mínimo 6 caracteres.' });
      return;
    }

    if (!formData.bairro.trim()) {
      setFeedback({ type: 'error', message: 'Selecione ou digite o bairro.' });
      return;
    }

    if (isOng) {
      const cnpjNumeros = onlyDigits(formData.cnpj);
      const phoneNumeros = onlyDigits(formData.phone);

      if (cnpjNumeros.length !== 14) {
        setFeedback({ type: 'error', message: 'Por favor, digite um CNPJ completo e válido.' });
        return;
      }

      if (phoneNumeros.length < 10 || phoneNumeros.length > 11) {
        setFeedback({ type: 'error', message: 'Por favor, digite um telefone/WhatsApp válido com DDD.' });
        return;
      }

      if (!formData.mission.trim()) {
        setFeedback({ type: 'error', message: 'A breve descrição da ONG é obrigatória.' });
        return;
      }

      if (!avatarFile) {
        setFeedback({ type: 'error', message: 'A foto de perfil ou logo da ONG é obrigatória.' });
        return;
      }
    }

    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.pass
    });

    if (authError) {
      setFeedback({ type: 'error', message: 'Erro ao criar conta: ' + authError.message });
      setLoading(false);
      return;
    }

    try {
      const userId = authData.user.id;
      let avatarUrl = 'https://via.placeholder.com/100';

      if (isOng) {
        const uploadedAvatar = await uploadAvatar(userId);
        if (uploadedAvatar) avatarUrl = uploadedAvatar;
      }

      const dbData = {
        id: userId,
        name: formData.name,
        email: formData.email,
        bairro: formData.bairro,
        type: isOng ? 'ONG' : 'Doador',
        approval_status: isOng ? 'pending' : 'approved',
        rejection_reason: null,
        cnpj: isOng ? formData.cnpj : null,
        phone: isOng ? formData.phone : null,
        ong_type: isOng ? formData.ong_type : null,
        website: isOng ? formData.website : null,
        mission: isOng ? formData.mission : null,
        avatar: avatarUrl
      };

      const { error: insertError } = await supabase.from('users').insert([dbData]);

      setLoading(false);

      if (insertError) {
        setFeedback({ type: 'error', message: 'Erro ao gravar perfil: ' + insertError.message });
        return;
      }

      await supabase.auth.signOut();
      setIsSuccess(true);
    } catch (error) {
      setLoading(false);
      setFeedback({ type: 'error', message: 'Erro ao finalizar cadastro: ' + error.message });
    }
  };

  if (isSuccess) {
    return (
      <section className="view-section active">
        <div className="auth-container" style={{ padding: '40px' }}>
          
          {isOng ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '4.5rem', marginBottom: '15px' }}>⏳</div>
              <h2 style={{ color: '#f0ad43', marginBottom: '15px', fontSize: '1.8rem' }}>Cadastro em Análise!</h2>
              <p
                style={{
                  color: '#555',
                  lineHeight: '1.6',
                  marginBottom: '30px',
                  fontSize: '1.05rem',
                  background: '#fdf8ec',
                  padding: '20px',
                  borderRadius: '15px',
                  border: '1px solid #faeed6'
                }}
              >
                Enviamos um link de confirmação para o seu e-mail. <br /><br />
                <strong>Atenção:</strong> Por questões de segurança e confiança da nossa comunidade, todas as novas ONGs passam por uma verificação da nossa equipa. Após confirmar o seu e-mail, o seu perfil ficará a aguardar a aprovação de um administrador para que possa publicar no Mural Solidário.
              </p>
              <button 
                className="btn-submit" 
                onClick={() => setView('login')} 
                style={{ background: '#f0ad43', width: '100%', padding: '15px', fontSize: '1.1rem' }}
              >
                Entendido, ir para o Login
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '4.5rem', marginBottom: '15px' }}>✉️</div>
              <h2 className="auth-title" style={{ marginBottom: '15px', color: 'var(--primary-color)' }}>Quase lá!</h2>
              <p
                style={{
                  color: '#666',
                  lineHeight: '1.6',
                  marginBottom: '30px',
                  fontSize: '1.05rem'
                }}
              >
                Enviamos um link de confirmação para o seu e-mail. Para garantir a segurança da nossa comunidade, por favor, verifique a sua caixa de entrada (ou pasta de spam) e clique no link para ativar a sua conta.
              </p>
              <button 
                className="btn-submit" 
                onClick={() => setView('login')}
                style={{ width: '100%', padding: '15px', fontSize: '1.1rem' }}
              >
                Ir para o Login
              </button>
            </div>
          )}

        </div>
      </section>
    );
  }

  return (
    <section className="view-section active">
      <div className="auth-container">
        <h2 className="auth-title" style={{ textAlign: 'center', marginBottom: '8px' }}>Criar Conta</h2>

        <p
          style={{
            textAlign: 'center',
            color: '#666',
            marginBottom: '22px',
            lineHeight: '1.5'
          }}
        >
          Escolha o tipo de conta e preencha seus dados para entrar na comunidade.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: '#f4f4f4',
            borderRadius: '14px',
            padding: '4px',
            marginBottom: '22px'
          }}
        >
          <button
            type="button"
            onClick={() => setAccountType('Doador')}
            style={{
              border: 'none',
              borderRadius: '10px',
              padding: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              background: accountType === 'Doador' ? 'var(--primary-color)' : 'transparent',
              color: accountType === 'Doador' ? '#fff' : '#666',
              transition: '0.2s'
            }}
          >
            Usuário
          </button>

          <button
            type="button"
            onClick={() => setAccountType('ONG')}
            style={{
              border: 'none',
              borderRadius: '10px',
              padding: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              background: accountType === 'ONG' ? 'var(--primary-color)' : 'transparent',
              color: accountType === 'ONG' ? '#fff' : '#666',
              transition: '0.2s'
            }}
          >
            ONG
          </button>
        </div>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Nome Completo / Organização</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              
            />
          </div>

          <div className="form-group">
            <label>E-mail</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              
            />
          </div>

          <div className="form-group">
            <label>Senha</label>
            <input
              type="password"
              name="pass"
              value={formData.pass}
              onChange={handleChange}
              
            />
          </div>

          <div className="form-group">
            <label>Região / Bairro</label>
            <select value={bairroSelect} onChange={handleBairroSelect} >
              <option value="">Selecione...</option>
              <option value="Centro">Centro</option>
              <option value="Icaraí">Icaraí</option>
              <option value="Fonseca">Fonseca</option>
              <option value="Santa Rosa">Santa Rosa</option>
              <option value="São Francisco">São Francisco</option>
              <option value="Itaipu">Itaipu</option>
              <option value="Piratininga">Piratininga</option>
              <option value="Ingá">Ingá</option>
              <option value="Outro">Outro...</option>
            </select>
          </div>

          {bairroSelect === 'Outro' && (
            <div className="form-group">
              <label>Digite seu Bairro</label>
              <input
                type="text"
                name="bairro"
                value={formData.bairro}
                onChange={handleChange}
                
              />
            </div>
          )}

          {isOng && (
            <div
              style={{
                marginTop: '18px',
                padding: '18px',
                background: '#f8fbff',
                border: '1px solid #e4eef8',
                borderRadius: '16px',
                marginBottom: '18px'
              }}
            >
              <h3
                style={{
                  fontSize: '1rem',
                  marginBottom: '14px',
                  color: 'var(--primary-color)'
                }}
              >
                Dados da ONG
              </h3>

              <div className="form-group">
                <label>CNPJ</label>
                <input
                  type="text"
                  name="cnpj"
                  value={formData.cnpj}
                  onChange={handleChange}
                  placeholder="00.000.000/0000-00"
                  
                />
              </div>

              <div className="form-group">
                <label>Tipo de ONG</label>
                <select
                  name="ong_type"
                  value={formData.ong_type}
                  onChange={handleChange}
                  
                >
                  <option value="Causa Animal">Causa Animal</option>
                  <option value="Assistência Social">Assistência Social</option>
                  <option value="Educação">Educação</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Meio Ambiente">Meio Ambiente</option>
                  <option value="Cultura">Cultura</option>
                  <option value="Outra">Outra</option>
                </select>
              </div>

              <div className="form-group">
                <label>Telefone / WhatsApp</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(21) 99999-9999"
                  
                />
              </div>

              <div className="form-group">
                <label>Site ou Rede Social</label>
                <input
                  type="text"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="instagram.com/suaong"
                />
              </div>

              <div className="form-group">
                <label>Breve Descrição da Instituição</label>
                <textarea
                  name="mission"
                  value={formData.mission}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Conte um pouco sobre o trabalho da ONG..."
                  
                />
              </div>

              <div className="form-group">
                <label>Foto de Perfil / Logo da ONG</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  
                />
              </div>
            </div>
          )}

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

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'A processar...' : 'Criar Conta'}
          </button>

          <p
            style={{
              marginTop: '18px',
              textAlign: 'center',
              color: '#666',
              fontSize: '0.95rem'
            }}
          >
            Já tem uma conta?{' '}
            <span
              onClick={() => setView('login')}
              style={{
                color: 'var(--primary-color)',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Entrar
            </span>
          </p>
        </form>
      </div>
    </section>
  );
}