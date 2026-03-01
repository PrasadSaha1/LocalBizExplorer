import { Link } from "react-router-dom";
import api from '../api';
import { useLocation } from "react-router-dom";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useState, useEffect } from "react";
import LoadingIndicator from "../components/LoadingIndicator";
import { isAuthenticated } from "./checkAuth";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function saveBusiness({business, setIsSaved}) {
    const res = api.post("https://business-search-s130.onrender.com/api/save_business/",
    { business_id: business.id,
      name: business.name,
      address: business.address,
      phone_number: business.phone_number,
      website: business.website,
    });
    setIsSaved(true);  // The save button will become an unsaved button
    toast.success("Business Saved!")
}

function unsaveBusiness({business, setIsSaved}) {
    const res = api.post("https://business-search-s130.onrender.com/api/unsave_business/",
    { business_id: business.id,});
    setIsSaved(false);  // The unsave button will become a save button
    toast.success("Business Unsaved!")
}

function BusinessDisplay({ business, resetView = null }) {
  const location = useLocation().pathname;  //looks like /page_name

  const [reviewsPage_numReviews, setReviewsPage_numReviews] = useState(0);
  const [reviewsPage_averageRating, setReviewsPage_averageRating] = useState("");
  const [makingReport, setMakingReport] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(null);

  const generatePDF = async (business, setMakingReport) => {
    setMakingReport(true);
    const res = await api.get(`https://business-search-s130.onrender.com/api/businesses/${business.id}/reviews/`);
    const reviews = res.data;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;
    const pageHeight = 280;

    // === Header ===
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Business Report", centerX, 15, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Business: ${business.name}`, centerX, 32, { align: "center" });
    doc.text(`Address: ${business.address}`, centerX, 38, { align: "center" });
    doc.text(`Phone: ${business.phone_number || "N/A"}`, centerX, 44, { align: "center" });
    doc.text(`Website: ${business.website || "N/A"}`, centerX, 50, { align: "center" });
    doc.text(`Rating: ${business.average_rating_display || "N/A"} (${business.num_reviews || 0} reviews)`, centerX, 56, { align: "center" });

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Reviews", centerX, 75, { align: "center" });
    let y = 85;
    
    if (reviews.length === 0) {
      doc.setFontSize(12);
      doc.text("No reviews yet.", 10, y);
    } else {
      for (let i = 0; i < reviews.length; i++) {
        const r = reviews[i];

        // Page break if needed
        if (y > pageHeight) {
          doc.addPage();
          y = 20;
        }

        // Draw a box around each review
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.rect(10, y - 5, 190, 35, "S"); // x, y, width, height

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Reviewer: ${r.name}`, 15, y);

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Rating: ${r.rating}/5`, 15, y + 7);
        const splitText = doc.splitTextToSize(r.review_text, 170);
        doc.text(`Review: ${splitText}`, 15, y + 14);
        doc.setFontSize(10);
        doc.text(`Posted: ${new Date(r.created_at).toLocaleString()}`, 15, y + 14 + splitText.length * 7);

        y += 45 + splitText.length * 7; // space for next review
      }
    }

    doc.save(`${business.name}-report.pdf`);
    setMakingReport(false);
  };

  const exportToExcel = async (business, setMakingReport) => {
    setMakingReport(true);

    // Fetch reviews
    const res = await api.get(`https://business-search-s130.onrender.com/api/businesses/${business.id}/reviews/`);
    const reviews = res.data;

    // Header info (search info can be added if needed)
    const businessInfo = [
      { Field: "Business Name", Value: business.name },
      { Field: "Address", Value: business.address },
      { Field: "Phone", Value: business.phone_number || "N/A" },
      { Field: "Website", Value: business.website || "N/A" },
      { Field: "Rating", Value: `${business.average_rating_display || "N/A"} (${business.num_reviews || 0} reviews)` },
    ];

    const ws1 = XLSX.utils.json_to_sheet(businessInfo, { header: ["Field", "Value"] });

    // Reviews
    const reviewData = reviews.map(r => ({
      Reviewer: r.name,
      Rating: r.rating,
      Review: r.review_text,
      Posted: new Date(r.created_at).toLocaleString()
    }));
    const ws2 = XLSX.utils.json_to_sheet(reviewData);

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Business Info");
    XLSX.utils.book_append_sheet(wb, ws2, "Reviews");

    XLSX.writeFile(wb, `${business.name}-report.xlsx`);
    setMakingReport(false);
  };

  // Export to CSV
  const exportToCSV = async (business, setMakingReport) => {
    setMakingReport(true);

    const res = await api.get(`https://business-search-s130.onrender.com/api/businesses/${business.id}/reviews/`);
    const reviews = res.data;

    const header = ["Business Name", "Address", "Phone", "Website", "Rating"];
    const businessRow = [[business.name, business.address, business.phone_number || "N/A", business.website || "N/A", `${business.average_rating_display || "N/A"} (${business.num_reviews || 0} reviews)`]];

    const reviewHeader = ["Reviewer", "Rating", "Review", "Posted"];
    const reviewRows = reviews.map(r => [r.name, r.rating, r.review_text, new Date(r.created_at).toLocaleString()]);

    // Combine all rows
    const csvContent = [
      header.join(","), 
      ...businessRow.map(r => r.map(val => `"${val}"`).join(",")),
      "", // empty line
      reviewHeader.join(","),
      ...reviewRows.map(r => r.map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `${business.name}-report.csv`);
    setMakingReport(false);
  };

  useEffect(() => {
    const fetchAuthStatus = async () => {
        const authStatus = await isAuthenticated(); 
        setIsLoggedIn(authStatus);
    };

    const fetchAverageRating = async () => {
        setLoading(true);  // as the average rating is getting fetched, loading will be displayed
        const res = await api.post(
          `https://business-search-s130.onrender.com/api/fetch_average_rating_and_save_status/`,
          { business_id: business.id }
        );

        setReviewsPage_numReviews(res.data.num_reviews);
        setReviewsPage_averageRating(res.data.average_rating);
        setIsSaved(res.data.is_saved);
        setLoading(false);
    };

    fetchAverageRating();
    fetchAuthStatus();
  }, [business.id, resetView]);

  if (loading) {
    return (
      <LoadingIndicator />
    );
  }

  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: "10px",
        padding: "15px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        backgroundColor: "#fff",
        width: "100%",
      }}
    >
      <h3 style={{ marginTop: "10px", marginBottom: "5px" }}>{business.name}</h3>
      <p><strong>Address:</strong> {business.address}</p>
      <p><strong>Phone:</strong> {business.phone_number}</p>
      <p>
        <strong>Website:</strong>{" "}
        <a href={business.website} target="_blank" rel="noopener noreferrer"
          style={{ wordBreak: "break-word", color: "#007bff" }}>
          {business.website}</a>
      </p>

      {/* If it's on the reviews page (more), show the dynamic ones, else, show the ones from the database */}
<div style={{ marginTop: "20px" }}>
  {/* Reviews Info */}
  <div style={{ marginBottom: "15px" }}>
    {location !== "/more" ? (
      <>
        <p><strong>Number of Reviews:</strong> {business.num_reviews}</p>
        <p><strong>Average Rating:</strong> {business.average_rating_display}</p>
      </>
    ) : (
      <>
        <p><strong>Number of Reviews:</strong> {reviewsPage_numReviews}</p>
        <p><strong>Average Rating:</strong> {reviewsPage_averageRating}</p>
      </>
    )}
  </div>

  {/* Action Buttons */}
  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
    {/* View Reviews Button */}
    {location !== "/more" && (
      <Link to="/more" state={{ business }}>
        <button className="btn btn-primary btn-md">View Reviews</button>
      </Link>
    )}

    {/* Save / Unsave or Login Prompt */}
    {!isLoggedIn ? (
      <div>
        <Link to="/register">Create an Account</Link> or <Link to="/login">Log In</Link> to leave save this business!
      </div>
    ) : isSaved ? (
      <button
        className="btn btn-warning btn-md"
        onClick={() => unsaveBusiness({ business, setIsSaved })}
      >
        Unsave
      </button>
    ) : (
      <button
        className="btn btn-success btn-md"
        onClick={() => saveBusiness({ business, setIsSaved })}
      >
        Save
      </button>
    )}

  </div>

    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "15px" }}>
    <button className="btn btn-warning btn-md" onClick={() => generatePDF(business, setMakingReport)}>
      Create PDF
    </button>
    <button className="btn btn-success btn-md" onClick={() => exportToExcel(business, setMakingReport)}>
      Export Excel
    </button>
    <button className="btn btn-info btn-md" onClick={() => exportToCSV(business, setMakingReport)}>
      Export CSV
    </button>
  </div>


  {makingReport && (<div style={{ textAlign: "center", marginTop: "20px" }}>
      <p>Making Report...</p>
    </div>)}

      </div>
    </div>
  );
}

export default BusinessDisplay;
