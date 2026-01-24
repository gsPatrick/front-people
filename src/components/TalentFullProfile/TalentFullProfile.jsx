import React from 'react';
import styles from './TalentFullProfile.module.css';
import { MdWork, MdSchool, MdLightbulb, MdVerified } from 'react-icons/md';

const Section = ({ title, icon, children }) => (
    <section className={styles.section}>
        <div className={styles.sectionHeader}>
            <span className={styles.icon}>{icon}</span>
            <h3 className={styles.sectionTitle}>{title}</h3>
        </div>
        <div className={styles.sectionContent}>
            {children}
        </div>
    </section>
);

const TalentFullProfile = ({ profileData }) => {
    if (!profileData) return <div className={styles.emptyState}>Nenhum dado completo de perfil disponível.</div>;

    // Normalização de dados (suporta scraping novo e legado)
    const experiences = profileData.structureExperience || profileData.experience || [];
    const education = profileData.structureEducation || profileData.education || profileData.formacao || [];
    const skills = profileData.skills || [];
    const certifications = profileData.certifications || [];
    const summary = profileData.about || profileData.resumo;

    return (
        <div className={styles.container}>
            {/* Resumo */}
            {summary && (
                <div className={styles.summaryBox}>
                    <h4 className={styles.summaryTitle}>Sobre</h4>
                    <p className={styles.summaryText}>{summary}</p>
                </div>
            )}

            {/* Experiência */}
            {experiences.length > 0 && (
                <Section title="Experiência Profissional" icon={<MdWork />}>
                    <div className={styles.timeline}>
                        {experiences.map((exp, idx) => (
                            <div key={idx} className={styles.timelineItem}>
                                <div className={styles.timelineContent}>
                                    <h4 className={styles.roleTitle}>{exp.role || exp.title}</h4>
                                    <span className={styles.companyName}>{exp.company || exp.companyName}</span>
                                    <div className={styles.metaRow}>
                                        <span className={styles.duration}>
                                            {exp.start || exp.inicio} - {exp.end || exp.fim || 'Atual'}
                                        </span>
                                        {exp.location && <span className={styles.location}>• {exp.location}</span>}
                                    </div>
                                    {exp.description && <p className={styles.description}>{exp.description}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* Formação */}
            {education.length > 0 && (
                <Section title="Formação Acadêmica" icon={<MdSchool />}>
                    <div className={styles.list}>
                        {education.map((edu, idx) => (
                            <div key={idx} className={styles.listItem}>
                                <h4 className={styles.schoolName}>{edu.school || edu.instituicao}</h4>
                                <p className={styles.degreeInfo}>
                                    {edu.degree || edu.curso} {edu.field && `• ${edu.field}`}
                                </p>
                                <span className={styles.duration}>
                                    {edu.start || edu.inicio} - {edu.end || edu.fim}
                                </span>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* Skills */}
            {skills.length > 0 && (
                <Section title="Competências" icon={<MdLightbulb />}>
                    <div className={styles.skillsGrid}>
                        {skills.map((skill, idx) => (
                            <span key={idx} className={styles.skillTag}>{typeof skill === 'string' ? skill : skill.name}</span>
                        ))}
                    </div>
                </Section>
            )}

            {/* Certificações */}
            {certifications.length > 0 && (
                <Section title="Certificações" icon={<MdVerified />}>
                    <ul className={styles.certList}>
                        {certifications.map((cert, idx) => (
                            <li key={idx} className={styles.certItem}>
                                {typeof cert === 'string' ? cert : cert.name}
                            </li>
                        ))}
                    </ul>
                </Section>
            )}
        </div>
    );
};

export default TalentFullProfile;
