import api from '../api';
import { useNavigate } from 'react-router-dom';
import GeneralForm from './GeneralForm';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link } from "react-router-dom";

function ForgotUsernameForm() {
    const handleForgotUsernameSubmit = async ({ email }) => {
        try {
            const res = await api.post('https://business-search-s130.onrender.com/api/forgot_username/', {
                email: email,
            });
            toast.success("An email has been sent to your address with your username(s).");
        } catch (err) {
            if (err.status === 404){  // Not Found from backend
                toast.error("No account found with this email address.");
            } else { // Catch all
                toast.error("An unknown error occured")
            }
        }

    };

    return (
        <GeneralForm
            mode="login"
            title="Retrieve Username"
            onSubmit={handleForgotUsernameSubmit}
            showEmail={true}
            bottomText={
                <>
                    <h6>
                        Remember your username? Log in <Link to="/login">here</Link>.
                    </h6>
                    <h6 style={{ marginTop: "15px" }}>
                        Know your username but forgot your password? Click <Link to="/forgot_password">here</Link> to reset it.
                    </h6>
                </>
            }
        />
    );
}

export default ForgotUsernameForm;
