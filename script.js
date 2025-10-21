const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewSection = document.getElementById('previewSection');
const previewImage = document.getElementById('previewImage');
const filenameCell = document.getElementById('filenameCell');
const dimensionCell = document.getElementById('dimensionCell');
const sizeCell = document.getElementById('sizeCell');
const fileTypeCell = document.getElementById('fileTypeCell');
const clearBtn = document.getElementById('clearBtn');
const widthsContainer = document.getElementById('widthsContainer');
const widthInput = document.getElementById('widthInput');
const addWidthBtn = document.getElementById('addWidthBtn');
const altTextInput = document.getElementById('altTextInput');
const generateBtn = document.getElementById('generateBtn');
const rightPanel = document.getElementById('rightPanel');
const progressSection = document.getElementById('progressSection');
const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');
const resultsSection = document.getElementById('resultsSection');
const resultsInfo = document.getElementById('resultsInfo');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const htmlCode = document.getElementById('htmlCode');
const safariNotice = document.getElementById('safariNotice');

let targetWidths = [400, 500, 600, 800, 1000, 1200];

// Detect Safari and adjust quality
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const QUALITY = isSafari ? 0.55 : 0.7;

// Show Safari notice
if (isSafari) {
	safariNotice.classList.add('active');
}

let uploadedFile = null;
let originalImage = null;
let generatedImages = [];
let htmlMarkup = '';

// Initialize widths display
function renderWidths() {
	widthsContainer.innerHTML = '';
	targetWidths.sort((a, b) => a - b).forEach(width => {
		const tag = document.createElement('div');
		tag.className = 'width-tag';
		tag.innerHTML = `
                    ${width}
                    <button class="width-remove" data-width="${width}">×</button>
                `;
		widthsContainer.appendChild(tag);
	});

	// Add event listeners to remove buttons
	document.querySelectorAll('.width-remove').forEach(btn => {
		btn.addEventListener('click', (e) => {
			const width = parseInt(e.target.dataset.width);
			targetWidths = targetWidths.filter(w => w !== width);
			renderWidths();
		});
	});
}

// Add width
addWidthBtn.addEventListener('click', () => {
	const width = parseInt(widthInput.value);
	if (width && width > 0 && !targetWidths.includes(width)) {
		targetWidths.push(width);
		renderWidths();
		widthInput.value = '';
	}
});

// Add width on Enter key
widthInput.addEventListener('keypress', (e) => {
	if (e.key === 'Enter') {
		addWidthBtn.click();
	}
});

// Initial render
renderWidths();

// Click to upload
uploadArea.addEventListener('click', () => {
	fileInput.click();
});

// File selected via input
fileInput.addEventListener('change', (e) => {
	const file = e.target.files[0];
	if (file && file.type.startsWith('image/')) {
		handleFile(file);
	}
});

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
	e.preventDefault();
	uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
	uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
	e.preventDefault();
	uploadArea.classList.remove('drag-over');

	const file = e.dataTransfer.files[0];
	if (file && file.type.startsWith('image/')) {
		handleFile(file);
	}
});

// Handle the uploaded file
function handleFile(file) {
	uploadedFile = file;

	const reader = new FileReader();
	reader.onload = (e) => {
		previewImage.src = e.target.result;
		previewSection.classList.add('active');
		rightPanel.classList.remove('active');

		// Get image dimensions
		const img = new Image();
		img.onload = () => {
			originalImage = img;
			const sizeKB = (file.size / 1024).toFixed(2);

			// Populate table cells
			filenameCell.textContent = file.name;
			dimensionCell.textContent = `${img.width} × ${img.height}px`;
			sizeCell.textContent = `${sizeKB} KB`;

			// Extract file type from MIME
			const fileType = file.type.split('/')[1].toUpperCase();
			fileTypeCell.textContent = fileType;
		};
		img.src = e.target.result;
	};
	reader.readAsDataURL(file);
}

// Clear button
clearBtn.addEventListener('click', (e) => {
	e.stopPropagation();
	uploadedFile = null;
	originalImage = null;
	generatedImages = [];
	htmlMarkup = '';
	fileInput.value = '';
	altTextInput.value = '';
	previewSection.classList.remove('active');
	rightPanel.classList.remove('active');
	previewImage.src = '';
});

// Generate button
generateBtn.addEventListener('click', async () => {
	if (!originalImage) return;

	generateBtn.disabled = true;
	rightPanel.classList.add('active');
	progressSection.classList.add('active');
	resultsSection.classList.remove('active');
	generatedImages = [];

	const baseName = uploadedFile.name.split('.')[0];
	const sortedWidths = [...targetWidths].sort((a, b) => a - b);

	for (let i = 0; i < sortedWidths.length; i++) {
		const width = sortedWidths[i];
		const progress = ((i + 1) / sortedWidths.length) * 100;

		progressText.textContent = `Processing ${width}px (${i + 1}/${sortedWidths.length})...`;
		progressFill.style.width = `${progress}%`;

		try {
			const blob = await resizeImage(originalImage, width, QUALITY);
			const filename = `${baseName}-${width}.webp`;

			generatedImages.push({
				filename: filename,
				width: width,
				blob: blob,
				size: blob.size
			});

			// Small delay for visual feedback
			await new Promise(resolve => setTimeout(resolve, 100));
		} catch (error) {
			console.error(`Error processing ${width}px:`, error);
		}
	}

	// Generate alt text
	let altText = altTextInput.value.trim();
	if (!altText) {
		// Auto-generate from filename: remove extension, replace dashes/underscores with spaces
		altText = baseName.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
	}

	// Generate HTML markup
	const srcsetParts = generatedImages.map(img =>
		`/images/${img.filename} ${img.width}w`
	).join(',\n    ');

	// Generate sizes attribute
	const sizesAttr = sortedWidths.map((width, index) => {
		if (index === sortedWidths.length - 1) {
			return `(min-width: ${sortedWidths[index - 1] + 1}px) ${width}px`;
		}
		return `(max-width: ${width}px) ${width}px`;
	}).join(', ');

	const smallestImage = generatedImages[0].filename;

	htmlMarkup = `<img
  srcset="${srcsetParts}"
  sizes="${sizesAttr}"
  src="/images/${smallestImage}"
  alt="${altText}"
  width="${originalImage.width}"
  height="${originalImage.height}"
  loading="lazy"
/>`;

	// Show results
	progressSection.classList.remove('active');
	resultsSection.classList.add('active');

	const totalSize = generatedImages.reduce((sum, img) => sum + img.size, 0);
	const totalSizeKB = (totalSize / 1024).toFixed(2);

	resultsInfo.innerHTML = `
                <strong>${generatedImages.length}</strong> images generated · Total size: <strong>${totalSizeKB} KB</strong>
            `;

	htmlCode.textContent = htmlMarkup;

	generateBtn.disabled = false;
});

// Download ZIP button
downloadBtn.addEventListener('click', async () => {
	if (generatedImages.length === 0) return;

	// Check if JSZip is loaded
	if (typeof JSZip === 'undefined') {
		alert('JSZip library failed to load. Please refresh the page and try again.');
		return;
	}

	downloadBtn.disabled = true;
	downloadBtn.textContent = '📦 Creating ZIP...';

	try {
		const zip = new JSZip();

		// Add all images to zip
		generatedImages.forEach(img => {
			zip.file(img.filename, img.blob);
		});

		// Generate zip file
		const zipBlob = await zip.generateAsync({ type: 'blob' });

		// Download
		const url = URL.createObjectURL(zipBlob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${uploadedFile.name.split('.')[0]}-responsive.zip`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	} catch (error) {
		console.error('Error creating ZIP:', error);
		alert('Failed to create ZIP file. Please try again.');
	}

	downloadBtn.disabled = false;
	downloadBtn.textContent = '📦 Download ZIP';
});

// Copy HTML button
copyBtn.addEventListener('click', async () => {
	try {
		await navigator.clipboard.writeText(htmlMarkup);
		copyBtn.textContent = '✅ Copied!';
		copyBtn.classList.add('copied');

		setTimeout(() => {
			copyBtn.textContent = '📋 Copy HTML';
			copyBtn.classList.remove('copied');
		}, 2000);
	} catch (error) {
		console.error('Failed to copy:', error);
		alert('Failed to copy to clipboard');
	}
});

// Resize image using canvas
function resizeImage(img, targetWidth, quality) {
	return new Promise((resolve, reject) => {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');

		// Calculate proportional height
		const aspectRatio = img.height / img.width;
		const targetHeight = Math.round(targetWidth * aspectRatio);

		canvas.width = targetWidth;
		canvas.height = targetHeight;

		// Draw resized image
		ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

		// Convert to WebP blob
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error('Failed to create blob'));
				}
			},
			'image/webp',
			quality
		);
	});
}
