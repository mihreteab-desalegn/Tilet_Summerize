const MCQViewer = ({ question }) => {




    if (question.length === 0) {
        return <div>No questions available because mcqs is empty.</div>;
    }

    return (
        <div>
            {question.map(({ id, question, choices }) => (
                <div key={id}>
                    <h3>{question}</h3>
                    <ul>
                        {choices.map((choice, idx) => (
                            <li key={idx}>{choice}</li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
};
export default MCQViewer;