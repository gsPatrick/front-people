// src/components/Modals/ScorecardResultsView.jsx

import React from 'react';
import styles from './ScorecardResultsView.module.css';
import { IoIosInformationCircleOutline } from "react-icons/io";
import { FiEdit } from "react-icons/fi";

const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

const ScorecardResultsView = ({ results, onClose, onEdit }) => {
    const evaluations = results || [];

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.content} onClick={(e) => e.stopPropagation()}>
                <header className={styles.header}>
                    <h3 className={styles.title}>Resumo das Avaliações</h3>
                    <button onClick={onClose} className={styles.closeButton}><CloseIcon /></button>
                </header>

                <main className={styles.mainScrollable}>
                    {evaluations.length === 0 ? (
                        <p className={styles.emptyState}>Nenhuma avaliação encontrada.</p>
                    ) : (
                        evaluations.map((evalItem, index) => (
                            <section key={index} className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <h4 className={styles.sectionTitle}>
                                        Avaliação de {evalItem.userName || 'Avaliador Anônimo'}
                                        <span className={styles.interviewName}>({evalItem.interviewName || 'Entrevista'})</span>
                                    </h4>
                                    <button onClick={() => onEdit(evalItem)} className={styles.editButton}>
                                        <FiEdit /> Editar
                                    </button>
                                </div>
                                
                                <div className={styles.notesBox}>
                                    <label>Parecer (Recomendação):</label>
                                    {/* CORREÇÃO: Exibindo como texto puro que respeita quebras de linha */}
                                    <div className={styles.textContent}>{evalItem.feedback?.comment || 'Não fornecido'}</div>
                                    <p><strong>Decisão:</strong> {evalItem.feedback?.proceed || 'Não decidido'}</p>
                                </div>

                                <div className={styles.notesBox}>
                                    <label>Anotações Privadas:</label>
                                    {/* CORREÇÃO: Exibindo como texto puro que respeita quebras de linha */}
                                    <div className={styles.textContent}>{evalItem.privateNotes || 'Nenhuma.'}</div>
                                </div>
                                
                                <div className={styles.categoriesGrid}>
                                    {evalItem.skillCategories.map(category => (
                                        <div key={category.name} className={styles.categoryCard}>
                                            <h5>{category.name}</h5>
                                            <ul>
                                                {category.skills.map(skill => (
                                                    <li key={skill.name}>
                                                        <span>{skill.name}</span>
                                                        <div className={styles.ratingBar} title={`Nota: ${skill.score || 'N/A'}`}>
                                                            <div className={styles.ratingFill} style={{ width: `${(skill.score || 0) * 20}%` }}></div>
                                                        </div>
                                                        <IoIosInformationCircleOutline title={skill.description || 'Sem descrição'} />
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))
                    )}
                </main>
            </div>
        </div>
    );
};

export default ScorecardResultsView;