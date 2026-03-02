import api from '../api';
import { useNavigate } from 'react-router-dom';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants';
import GeneralForm from './GeneralForm';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link } from "react-router-dom";

function LogInForm() {
    const navigate = useNavigate();

    const handleLogin = async ({ username, password }) => {
        try {
            const res = await api.post(
                "api/token/",
                { username, password },
                { timeout: 10000 } // 10 seconds in milliseconds
            );

            localStorage.setItem(ACCESS_TOKEN, res.data.access);
            localStorage.setItem(REFRESH_TOKEN, res.data.refresh);

            toast.success("Logged in successfully!");
            navigate('/'); // go to the homescreen
        } catch (err) {
            if (err.code === 'ECONNABORTED') {
                toast.error("Request timed out. Please reload the page and try again.");
            } else {
                const data = err.response?.data;
                if (data?.detail) toast.error("Incorrect username or password");  
                else toast.error("An unknown error occurred"); 
            }
        }
    };

    return (
        <GeneralForm
            mode="login"
            title="Login"
            showUsername={true}
            showPassword={true}
            onSubmit={handleLogin}
            bottomText={
                <>
                    <h6>
                        Don't have an account? Click <Link to="/register">here</Link> to create one.
                    </h6>
                    <h6 style={{ marginTop: "15px" }}>
                        Forgot your username? Click <Link to="/forgot_username">here</Link>.
                    </h6>
                    <h6 style={{ marginTop: "15px" }}>
                        Forgot your password? Click <Link to="/forgot_password">here</Link>.
                    </h6>
                </>
            }
        />
    );
}

export default LogInForm;
