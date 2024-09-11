import { getTramStops } from './helpers.js'; // Make sure helpers.js is properly configured

document.addEventListener("DOMContentLoaded", async () => {
    const stopsContainer = document.getElementById("stops-container");

    // Fetch tram stops
    const stops = await getTramStops();

    // Function to create a QR code and append it to the container
    function createQRCode(stop) {
        const url = `https://example.com/stops/${stop.stop_id}`; // Replace with your actual URL format

        // Create a div for the QR code
        const qrDiv = document.createElement("div");
        qrDiv.classList.add("qr-code");

        // Create a container for the stop info and QR code
        const stopDiv = document.createElement("div");
        stopDiv.classList.add("stop-info");
        
        // Add stop name and QR code
        const stopName = document.createElement("div");
        stopName.textContent = `Stop: ${stop.stop_name}`;
        stopDiv.appendChild(stopName);

        // Generate QR code
        QRCode.toDataURL(url, { width: 150, height: 150 }, function (err, qrCodeURL) {
            if (err) {
                console.error("Error generating QR code:", err);
                return;
            }
            const img = document.createElement("img");
            img.src = qrCodeURL;
            qrDiv.appendChild(img);
        });

        stopsContainer.appendChild(stopDiv);
    }

    // Generate QR codes for all stops
    stops.forEach(stop => {
        const stopUrl = `${window.location.origin}/#stop=${stop.stop_id}`;
        const qrCodeElement = generateQRCode(stopUrl); // Generate QR code with stop URL
        stopElement.innerHTML = `
            <h2>Stop ${stop.stop_id}</h2>
            <div>${qrCodeElement}</div>
            <a href="${stopUrl}">View Stop Details</a>
        `;
    });
    });
