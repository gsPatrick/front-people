import React, { useEffect, useState } from 'react';
import styles from './LinkedInAutomaticAddModal.module.css';

const LinkedInAutomaticAddModal = ({ talentName, onCreateNewTalent, onCreateApplication, linkedInProfileTalent, defaultJobId, onComplete }) => {
  const [loadingText, setLoadingText] = useState('Iniciando adição...');

  useEffect(() => {
    const performAutomaticAdd = async () => {
      // 1. Criar o talento (usando o ID fixo do perfil LinkedIn)
      setLoadingText(`Adicionando ${talentName} à InHire...`);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simula tempo de criação de talento
      const talentId = onCreateNewTalent(linkedInProfileTalent.name, linkedInProfileTalent.headline, linkedInProfileTalent.id);
      
      // 2. Criar a candidatura para a vaga padrão
      setLoadingText(`Associando à vaga '${defaultJobId}'...`);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simula tempo de criação de candidatura
      onCreateApplication(talentId, defaultJobId);

      setLoadingText('Concluído! Redirecionando...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Pequeno delay antes de redirecionar (total 4s)

      onComplete(); // Sinaliza ao pai que a operação terminou e para redirecionar/fechar
    };

    performAutomaticAdd();

    // Limpa o timer se o componente for desmontado antes de finalizar
    return () => clearTimeout(); // Apenas para garantir
  }, []); // Executa apenas uma vez ao montar o componente

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3 className={styles.title}>{loadingText}</h3>
        <p className={styles.subtitle}>Modo Automático: Por favor, não saia desta página.</p>
        <span className={styles.loader}></span>
        <p className={styles.footerText}>
          O perfil de **{talentName}** está sendo adicionado e vinculado automaticamente.
        </p>
      </div>
    </div>
  );
};

export default LinkedInAutomaticAddModal;