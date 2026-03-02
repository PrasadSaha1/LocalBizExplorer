import api from '../api';
import { useNavigate } from 'react-router-dom';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants';
import GeneralForm from './GeneralForm';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link } from "react-router-dom";

function RegisterForm() {
    const navigate = useNavigate();

    const handleRegister = async ({ username, password, confirmPassword, email }) => {
        if (password.length < 8) {
            toast.error("Password must be at least 8 characters long");
            return;
        }
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        try {
            await api.post(
                "api/user/register/",
                { username, password, confirmPassword, email },
                { timeout: 10000 } // 10 seconds
            );

            // Login request with 10-second timeout
            const loginRes = await api.post(
                "api/token/",
                { username, password },
                { timeout: 10000 } // 10 seconds
            );

            localStorage.setItem(ACCESS_TOKEN, loginRes.data.access);
            localStorage.setItem(REFRESH_TOKEN, loginRes.data.refresh);

            toast.success("Account Created successfully!");
            navigate('/');
        } catch (err) {
            if (err.code === 'ECONNABORTED') {
                toast.error("Request timed out. Please reload the page and try again.");
            } else {
                const data = err.response?.data;
                if (data?.username) toast.error(data.username[0]); // if username is taken
                else if (data?.email) toast.error(data.email[0]); // if email is invalid
                else toast.error("An unknown error occurred");
            }
        }
    };


    return (
        <GeneralForm
            mode="register"
            title="Create Account"
            onSubmit={handleRegister}
            showUsername={true}
            showPassword={true}
            showConfirmPassword={true}
            showEmail={true}
            emailDescription={"Email (optional)"}
            requireEmail={false}
            bottomText={
                <h6>
                    Already have an account? Click <Link to="/login">here</Link> to login.
                </h6>
            }
        />
    );
}

export default RegisterForm;
