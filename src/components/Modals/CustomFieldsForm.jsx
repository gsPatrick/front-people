// src/components/Modals/CustomFieldsForm.jsx

import React from 'react';
import styles from './FormStyles.module.css';

// Componente helper para renderizar o input correto
const renderFieldInput = (field, formData, handleChange) => {
    // Usamos field.id como a chave/nome do campo para o onChange
    const fieldIdentifier = field.id;
    
    // O valor atual do campo que está no estado `customFormData` (passado como `formData`)
    let currentValue = formData[fieldIdentifier];

    // Tratamento para valores de select e boolean que podem vir como objetos/booleanos
    if (field.type === 'select') {
        // Se o valor no formData é um objeto (ex: {id: 'abc', value: 'Masculino'}),
        // o select precisa do `id` da opção para ser um Controlled Component.
        currentValue = typeof currentValue === 'object' && currentValue !== null
                       ? currentValue.id // Pega o ID do objeto
                       : currentValue; // Senão, é o valor simples
    } else if (field.type === 'boolean') {
        // `checked` espera um booleano
        currentValue = !!currentValue; // Converte para booleano explícito
    } else if (currentValue === undefined || currentValue === null) {
        currentValue = ''; // Inputs de texto/número esperam string vazia para valores nulos/undefined
    }


    switch (field.type) {
        case 'text':
        case 'shortText': 
            return <input type="text" name={fieldIdentifier} value={currentValue} onChange={handleChange} placeholder="--" />;
        
        case 'number':
            return <input type="number" name={fieldIdentifier} value={currentValue} onChange={handleChange} placeholder="--" />;
        
        case 'date':
            return <input type="date" name={fieldIdentifier} value={currentValue} onChange={handleChange} />;
        
        case 'textarea':
        case 'longText': 
             return <textarea name={fieldIdentifier} value={currentValue} onChange={handleChange} placeholder="--" />;

        case 'select': {
            // `field.answerOptions` ou `field.options` dependendo da entidade
            const options = field.answerOptions || field.options || [];
            return (
                <select 
                    name={fieldIdentifier} 
                    value={currentValue || ''} // Garante que o valor seja controlado e lide com null/undefined
                    onChange={handleChange}
                >
                    <option value="">Selecione uma opção</option>
                    {options.map((opt, idx) => (
                        <option key={opt.id || opt.value || idx} value={opt.id || opt.value || opt}>
                            {opt.label || opt.title || opt.name || opt.value || opt}
                        </option>
                    ))}
                </select>
            );
        }
        
        case 'boolean':
            return (
                <label className={styles.checkboxContainer}>
                    <input
                        type="checkbox"
                        name={fieldIdentifier}
                        checked={currentValue} // `currentValue` já é um booleano aqui
                        onChange={handleChange}
                    />
                    <span className={styles.checkboxMark}></span> {field.name}
                </label>
            );
        
        case 'fileUpload':
            return <input type="file" name={fieldIdentifier} onChange={handleChange} disabled={true} title="Upload de arquivos não suportado na edição simples." />;
        
        default:
            return <input type="text" name={fieldIdentifier} value={String(currentValue)} onChange={handleChange} placeholder={`Campo do tipo "${field.type}" (Não mapeado)`} />;
    }
};

const CustomFieldsForm = ({ fields, formData, handleChange }) => {
  // `fields` agora é o `applicationCustomFields` do pai, que já tem name, type, value, answerOptions, etc.
  const validFields = fields?.filter(f => f.id && f.name && f.type) || [];

  if (validFields.length === 0) {
    return (
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
        Nenhum campo personalizado configurado para esta candidatura.
      </p>
    );
  }

  return (
    <div className={styles.formContainer}>
      {validFields.map(field => (
        <div key={field.id} className={styles.inputGroup}>
          {/* Não mostra o label para checkbox, pois ele já está dentro do <label> */}
          {field.type !== 'boolean' && <label>{field.name}{field.required ? ' *' : ''}</label>}
          {renderFieldInput(field, formData, handleChange)}
        </div>
      ))}
    </div>
  );
};

export default CustomFieldsForm;