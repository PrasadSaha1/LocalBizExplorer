import "../styles/Home.css";
import Base from '../components/Base';
import { isAuthenticated } from '../components/checkAuth';
import { useState, useRef } from 'react';
import BusinessDisplay from '../components/BusinessDisplay'
import { Link } from "react-router-dom";
import api from '../api';
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


function AccountButtons({ isLoggedIn }) {
    // If not logged in show information about creating an account or logging ing
    if (!isLoggedIn) {
        return (
            <div>
                <h3>Create an account to unlock more features</h3>
                <Link to="/register">
                    <button className="btn btn-primary btn-lg">Create Account</button>
                </Link>

                <h3 style={{ marginTop: "50px" }}>Or log into an existing account</h3>
                <Link to="/login">
                    <button className="btn btn-primary btn-lg">Login</button>
                </Link>
            </div>
        );
    } else {  // If not logged in, return an empty div
        return <div></div>
    }
}

export default function Home() {
    const [errors, setErrors] = useState({});
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sortOption, setSortOption] = useState("");

    // These are for output reports
    const [businessTypeSearched, setBusinessTypeSearched] = useState("");
    const [businessLocationSearched, setBusinessLocationSearched] = useState("");

    const businessTypeRef = useRef(null);
    const businessLocationRef = useRef(null);
    const numBusinessRef = useRef(null);

    const generatePDF = async () => {
        const doc = new jsPDF();
        let y = 55; // initial vertical position for first business
        const pageWidth = doc.internal.pageSize.getWidth();
        const centerX = pageWidth / 2;
        const pageHeight = 280; // page height limit

        // Add header
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("LocalBizExplorer Report", centerX, 15, { align: "center" });

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Business Type: ${businessTypeSearched}`, centerX, 22, { align: "center" });
        doc.text(`Zipcode: ${businessLocationSearched}`, centerX, 27, { align: "center" });

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("Businesses Found", centerX, 40, { align: "center" })

        for (let i = 0; i < businesses.length; i++) {
            const business = businesses[i];

            // Page break 
            if (y > pageHeight) {
                doc.addPage();
                y = 25; // reset starting y for businesses
            }

            // Drawing a box around the text
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.rect(5, y - 7, 200, 40, "S"); // x, y, width, height

            // Business Name
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text(business.name || "No Name", 10, y);

            // Business info
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.text(`Address: ${business.address || "N/A"}`, 10, y + 7);
            doc.text(`Phone: ${business.phone_number || "N/A"}`, 10, y + 14);
            doc.text(`Website: ${business.website || "N/A"}`, 10, y + 21);
            doc.text(`Rating: ${business.average_rating_display || "N/A"} (${business.num_reviews || 0} reviews)`, 10, y + 28);

            y += 50; // space before next business
        }
        doc.save("businesses.pdf");
    };

    const exportToExcel = () => {
        // Add header row with search info
        const headerRow = [
            { Header: "Business Type", Value: businessTypeSearched },
            { Header: "Zipcode", Value: businessLocationSearched }
        ];

        const data = businesses.map(business => ({
            Name: business.name || "N/A",
            Address: business.address || "N/A",
            Phone: business.phone_number || "N/A",
            Website: business.website || "N/A",
            "Average Rating": business.average_rating_display || "N/A",
            "Number of Reviews": business.num_reviews || 0,
        }));

        const workbook = XLSX.utils.book_new();

        // Add search info sheet
        const headerSheet = XLSX.utils.json_to_sheet(headerRow);
        XLSX.utils.book_append_sheet(workbook, headerSheet, "Search Info");

        // Add businesses sheet
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Businesses");

        XLSX.writeFile(workbook, "businesses.xlsx");
    };

    const exportToCSV = () => {
        const data = [
            { "Business Type": businessTypeSearched, "Zipcode": businessLocationSearched },
            ...businesses.map(business => ({
            Name: business.name || "N/A",
            Address: business.address || "N/A",
            Phone: business.phone_number || "N/A",
            Website: business.website || "N/A",
            "Average Rating": business.average_rating_display || "N/A",
            "Number of Reviews": business.num_reviews || 0,
            }))
        ];

        const worksheet = XLSX.utils.json_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(worksheet);

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        saveAs(blob, "businesses.csv");
    };


    const handleSubmit = async (e) => {
        e.preventDefault();  // prevent submission in cases there are errors

        const businessType = businessTypeRef.current.value.trim();  // Gets the user inputs
        const zipcode = businessLocationRef.current.value.trim();
        const numBusinesses = numBusinessRef.current.value.trim();

        const newErrors = {};

        // Checks if the data is valid
        if (!businessType) newErrors.businessType = "Business type is required.";
        if (!zipcode) newErrors.zipcode = "Zipcode is required.";
        else if (!/^\d{5}$/.test(zipcode)) newErrors.zipcode = "Zipcode must be exactly 5 digits.";
        if (!numBusinesses) newErrors.numBusinesses = "Number of businesses is required.";
        else if (Number(numBusinesses) <= 0) newErrors.numBusinesses = "Number must be greater than 0.";
        else if (Number(numBusinesses) > 10) newErrors.numBusinesses = "Number must be no more than 10.";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors); // Gives the user errors
            return;  // Exits the function
        }

        setErrors({});  // Clear errors and businesses
        setBusinesses([]); 
        setLoading(true);

        setBusinessTypeSearched(businessType);
        setBusinessLocationSearched(zipcode);

        const params = {query: `${businessType} ${zipcode}`, limit: Number(numBusinesses),};
        const toQueryString = (params) => new URLSearchParams(params).toString();  // formats the data into a string

        try {
            // calls the API
            const response = await fetch(
                `https://api.openwebninja.com/local-business-data/search?${toQueryString(params)}`,
                {
                    headers: {
                        "x-api-key": "ak_ypnr6hs38cqy5qpdnaprhijkw8xsp0f6kzgbdeesm9cn9ly",
                    },
                }
            );

            const api_data = await response.json();
            var filtered_data = []
            var business_ids = []
            
            // takes the api data and puts it into filtered_data
            api_data.data.forEach(element => { 
                var business = {}
                business.id = element.business_id;
                business.photo_url = element.photos_sample?.[0]?.photo_url_large;
                business.address = element.address;
                business.phone_number = element.phone_number;
                business.name = element.name;
                business.website = element.website;

                business_ids.push(element.business_id)
                filtered_data.push(business)
            });

            // gets review data from LocalBizExplorer's database (not the api)
            const res = await api.post(
            'https://business-search-s130.onrender.com/api/view_business_rating/',
            { business_ids: business_ids }
            );

            const business_review_data = res.data.business_review_data;

            // for each business in filtered_data, it adds more information, and i++ moves to the next business
            var i = 0;
            filtered_data.forEach(business =>{
                business.num_reviews = business_review_data[i]["num_reviews"]
                business.average_rating_display = business_review_data[i]["average_rating_display"]
                i++
            })

            setBusinesses(filtered_data);
            setLoading(false);

        } catch (err) {
            // Catch all for errors (ie. Rate limited by API)
            console.error("API call failed:", err);
        }
    };

    const sortedBusinesses = [...businesses].sort((a, b) => {
        // business.average_rating_display is "4.0/5", so this parses the data
        const getRating = (business) => parseFloat(business.average_rating_display) || 0;

        switch (sortOption) {
            case "ratingHigh":
                return getRating(b) - getRating(a);
            case "ratingLow":
                return getRating(a) - getRating(b);;
            case "reviewsHigh":
                return b.num_reviews - a.num_reviews;
            case "reviewsLow":
                return a.num_reviews - b.num_reviews;
            case "nameAZ":
                return a.name.localeCompare(b.name);
            case "nameZA":
                return b.name.localeCompare(a.name);
            default:
                return 0;
        }
    });


    return (
        <Base>
            <div className="home-container">
                <h1 className="mb-3">Welcome to LocalBizExplorer</h1>
                <h4 className=" text-muted">Find information and reviews on businesses near you!</h4>

                <form className="mt-5 w-100" style={{ maxWidth: "500px" }} onSubmit={handleSubmit}>
                    <h3 className="mb-3">Enter in the type of business</h3>

                    <div className="mb-3">
                        <input
                            ref={businessTypeRef}
                            className="form-control"
                            placeholder="Business Sector (ie. Library)"
                        />
                        {errors.businessType && <p className="text-danger">{errors.businessType}</p>}
                    </div>

                    <div className="mb-3">
                        <input
                            ref={businessLocationRef}
                            type="text"
                            className="form-control"
                            placeholder="Zipcode (ie. 05488)"
                        />
                        {errors.zipcode && <p className="text-danger">{errors.zipcode}</p>}
                    </div>

                    <div className="mb-4">
                        <input
                            ref={numBusinessRef}
                            type="number"
                            className="form-control"
                            placeholder="Number of Businesses to Display (max: 10)"
                        />
                        {errors.numBusinesses && <p className="text-danger">{errors.numBusinesses}</p>}
                    </div>

                    <button className="btn btn-success btn-lg w-100" type="submit">
                        Submit
                    </button>

                </form>
                {loading && <div>Loading...</div>}  
            </div>

            {businesses.length > 0 && (
            <div style={{ textAlign: "center", marginBottom: "2rem", display: "flex", gap: "10px", justifyContent: "center" }}>
                <button className="btn btn-warning" onClick={generatePDF}>Create PDF</button>
                <button className="btn btn-success" onClick={exportToExcel}>Export Excel</button>
                <button className="btn btn-info" onClick={exportToCSV}>Export CSV</button>
            </div>
            )}

            {businesses.length > 0 && (
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                    <select
                    className="form-select"
                    style={{ maxWidth: "300px", margin: "0 auto" }}
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    >
                    <option value="">Sort By</option>
                    <option value="ratingHigh">Rating (High → Low)</option>
                    <option value="ratingLow">Rating (Low → High)</option>
                    <option value="reviewsHigh">Most Reviews</option>
                    <option value="reviewsLow">Least Reviews</option>
                    <option value="nameAZ">Name (A → Z)</option>
                    <option value="nameZA">Name (Z → A)</option>
                    </select>
                </div>
                )}




            <div style={{display: "grid",rowGap: "20px"}}>
            {sortedBusinesses.map((business, index) => (
            <div key={index}>
                <BusinessDisplay business={business} />
            </div>
            ))}

             <div className="home-container">
                <AccountButtons isLoggedIn={isAuthenticated()}/>
            </div>
            
            </div>
        </Base>
    );
}
