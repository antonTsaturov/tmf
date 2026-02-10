import '@/styles/StructurePreview.css';
import { Study, StudySite } from '@/types/types';
import { useEffect, useState } from 'react';
import { StudyUser } from './StudyManager';

export const StructurePreview = ({structure} : { structure: any}) => {

    //console.log('StructurePreview: ', structure)
    return (
        <div className="sites-structure-preview">
            <div className="structure-header">
            <h3>Current structure (JSON):</h3>
            {/* <button 
                //onClick={() => setSiteObject([])}
                className="clear-button"
            >
                Clear Preview
            </button> */}
            </div>
                {structure && (
                    <pre className="json-preview">
                        {JSON.stringify(structure, null, 2)}
                    </pre>
                )}
        </div>
    )
}