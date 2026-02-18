import '@/styles/StructurePreview.css';

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