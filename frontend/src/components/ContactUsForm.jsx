import api from '../api';
import GeneralForm from './GeneralForm';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link } from "react-router-dom";

function ContactUsForm() {
    const handleContactUsSubmit = async ({ email, subject, message }) => {
        try {
            const res = await api.post('https://business-search-s130.onrender.com/api/contact_us/', {
                email: email,
                subject: subject,
                message: message
            });
            toast.success("Message sent!")
        } catch (err) {
            if (err.status === 401){  // Unauthorized from backend
                toast.error("Invalid email address");
            } else {
                toast.error("An unknown error occured.")
            }
        } 
    };

    return (
        <GeneralForm
            title="Contact Us"
            showEmail={true}
            showSubject={true}
            showMessage={true}
            onSubmit={handleContactUsSubmit}
            bottomText={
                <Link className="btn btn-primary" to="/settings">Back to Settings</Link>
            }
        />
    );
}

export default ContactUsForm;
