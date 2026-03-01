import { useLocation } from "react-router-dom";
import Base from '../components/Base';
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import api from '../api';
import { isAuthenticated } from '../components/checkAuth';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import BusinessDisplay from "../components/BusinessDisplay";
import LoadingIndicator from "../components/LoadingIndicator";
import BackButton from "../components/BackButton";
import { jsPDF } from "jspdf";

function Review({ review, yourReview, setResetView }) {
  const deleteReview = async (reviewId) => {
    const confirmed = window.confirm("Are you sure you want to delete this review?");
    if (!confirmed) return;
      await api.post('https://business-search-s130.onrender.com/api/delete_review/', { review_id: reviewId });
      toast.success("Review deleted!");
      setResetView(prev => !prev); 
    }

  return (
    <div
      key={review.id}
      style={{
        border: "1px solid #ccc",
        marginBottom: "10px",
        padding: "10px",
        borderRadius: "8px",
      }}
    >
      <p>
        <strong>{review.name}</strong> rated: {review.rating}/5
      </p>
      <p>{review.review_text}</p>
      <small>{new Date(review.created_at).toLocaleString()}</small>
      {yourReview && (
        <button
          className="btn btn-danger btn-sm"
          style={{ display: "block", marginTop: "10px" }}
          onClick={() => deleteReview(review.id)}
        >
          Delete Review
        </button>
      )}
    </div>
  );
}


function ShowLeaveReview({isLoggedIn, business, resetView, setResetView}) {
    const [name, setName] = useState("");
    const [reviewText, setReviewText] = useState("");
    const [rating, setRating] = useState(0);      
    const [hoverRating, setHoverRating] = useState(0); 
    const [sendingReview, setSendingReview] = useState(false);
    const [loadingPage_createReview, setLoadingPage_createReview] = useState(true);
    const [errors, setErrors] = useState({});
    const [previousReview, setPreviousReview] = useState(false); 

    useEffect(() => {
        if (isLoggedIn) {
        const checkReview = async () => {
            setLoadingPage_createReview(true);
            const res = await api.post("https://business-search-s130.onrender.com/api/check_if_review_left/",
            { business_id: business.id });
            setPreviousReview(res.data.review);
            setLoadingPage_createReview(false);
        };
        checkReview();
        }
    }, [business.id, isLoggedIn, resetView]);


    const submitReview = async () => {
        const newErrors = {};
        if (!rating) newErrors.rating = "Rating is required.";
        if (!name) newErrors.name = "Name is required.";
        if (!reviewText) newErrors.reviewText = "Review is required.";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        setErrors({});

        setSendingReview(true);
        const res = await api.post("https://business-search-s130.onrender.com/api/create_review/", {
            business_id: business.id,
            business_name: business.name,
            business_address: business.address,
            business_phone: business.phone_number,
            business_website: business.website,
            name: name,
            rating: rating,
            review_text: reviewText,
        })
        setSendingReview(false);
        toast.success("Review sent!")
        setResetView(prev => !prev);
    }

    if (isLoggedIn){
        if (previousReview){
            return <div style={{marginTop: "30px"}}>
                <h1>Your Review</h1>
                <Review review={previousReview} yourReview={true} setResetView={setResetView}/>
            </div>
        } else {
        if (loadingPage_createReview){
            return <div style={{marginTop: "50px"}}> 
                <LoadingIndicator />
            </div>
        }
        return <div
        style={{
          margin: "40px auto",
          padding: "20px",
          border: "1px solid #ccc",
          borderRadius: "10px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          backgroundColor: "#fff",
        }}
      >
        <h1 style={{ marginBottom: "20px", textAlign: "center" }}>Leave a Review</h1>

        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              style={{
                fontSize: "30px",
                color: (hoverRating || rating) >= star ? "#FFD700" : "#ccc",
                cursor: "pointer",
                transition: "color 0.2s",
                marginRight: "5px",
              }}
            >
              ★
            </span>
          ))}
            {errors.rating && <p className="text-danger">{errors.rating}</p>}
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Your Name
          </label>
          <input
            type="text"
            placeholder="Enter your name"
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              fontSize: "16px",
            }}
          />
            {errors.name && <p className="text-danger">{errors.name}</p>}
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Your Review
          </label>
          <textarea
            placeholder="Write your review here..."
            rows={5}
            onChange={(e) => setReviewText(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              fontSize: "16px",
              resize: "vertical",
            }}
          />
            {errors.reviewText && <p className="text-danger">{errors.reviewText}</p>}
        </div>

        <div style={{ textAlign: "center" }}>
          <button className="btn btn-primary btn-md" onClick={submitReview}>Submit Review</button>
        </div>
        {sendingReview && <div>Sending Review...</div>}  
      </div>
    }} else {
        return <div style={{marginTop: "20px"}}>
        <h1 style={{ marginBottom: "20px", textAlign: "center" }}>Leave a Review</h1>
            <Link to="/register">Create an Account</Link> or <Link to="/login">Log In</Link> to leave a review!
        </div>
    }
}

function More() {
  const location = useLocation();
  const { business } = location.state || {}; 

  const [reviews, setReviews] = useState([]);
  const [resetView, setResetView] = useState(false);  // must be defined here as it is used here
  const [loadingPage_allReviews, setLoadingPage_allReviews] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
        setLoadingPage_allReviews(true);
        const res = await api.get(`https://business-search-s130.onrender.com/api/businesses/${business.id}/reviews/`);
        setReviews(res.data);
        setLoadingPage_allReviews(false);
    };

    fetchReviews();
  }, [business.id, resetView]);  // will go again after the user leaves a review


  return (
    <Base>
    <BackButton />

    <BusinessDisplay business={business} resetView={resetView}/>
    <ShowLeaveReview isLoggedIn={isAuthenticated()} business={business} resetView={resetView} setResetView={setResetView}/>


    <div style={{ marginTop: "40px" }}>
    <h1>All Reviews</h1>

    {!loadingPage_allReviews? (
        reviews.length === 0 ? (
            <p>No reviews yet. Be the first to review!</p>
        ) : (
            reviews.map((review) => (
                <Review review={review} yourReview={false} setResetView={setResetView} />
            ))
        )
    ): (
        <LoadingIndicator />
    )}
    </div>
    

    </Base>
  );
}

export default More;
