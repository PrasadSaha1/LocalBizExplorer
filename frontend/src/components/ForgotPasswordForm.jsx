import api from '../api';
import GeneralForm from './GeneralForm';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link } from "react-router-dom";

function ForgotPasswordForm() {
    const handleForgotPasswordSubmit = async ({ username }) => {
        try {
            const res = await api.post('https://business-search-s130.onrender.com/api/forgot_password/', {
                username: username,
            });
            toast.success("An email has been sent to your address with instructions to reset your password.");
        } catch (err) {
            if (err.status === 404){  // Not Found from backend
                toast.error("No email associated with this username.");
            } else if (err.status === 400) {  // Bad Request from backend
                toast.error("Username does not exist");
            } else { // Catch all 
                toast.error("An unknown error occured")
            }
        }

    };
    return (
        <GeneralForm
            mode="login"
            title="Reset Password"
            onSubmit={handleForgotPasswordSubmit}
            showUsername={true}
            bottomText={
                <>
                    <h6>
                        Remember your password? Log in <Link to="/login">here</Link>.
                    </h6>
                    <h6 style={{ marginTop: "15px" }}>
                        Forgot your username? Click <Link to="/forgot_username">here</Link> to retrieve it.
                    </h6>
                </>
            }
        />
    );
}

export default ForgotPasswordForm;
