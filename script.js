const apiUrl = 'http://127.0.0.1:5000'; // Flask server address
const studentListBody = document.getElementById('student-list');

// --- Helper Function for Comparison (Used by all sorting algorithms) ---
const getComparator = (key, order) => (a, b) => {
    let valA = a[key];
    let valB = b[key];

    // Handle string comparison for names
    if (key === 'name') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
    }

    if (valA < valB) {
        return order === 'asc' ? -1 : 1;
    }
    if (valA > valB) {
        return order === 'asc' ? 1 : -1;
    }
    return 0; // Values are equal
};

// --- SORTING ALGORITHMS IMPLEMENTATIONS ---

// 1. Bubble Sort
function bubbleSort(arr, key, order) {
    const compare = getComparator(key, order);
    const n = arr.length;
    let swapped;
    do {
        swapped = false;
        for (let i = 0; i < n - 1; i++) {
            if (compare(arr[i], arr[i + 1]) > 0) {
                [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                swapped = true;
            }
        }
    } while (swapped);
    return arr;
}

// 2. Insertion Sort
function insertionSort(arr, key, order) {
    const compare = getComparator(key, order);
    const n = arr.length;
    for (let i = 1; i < n; i++) {
        let current = arr[i];
        let j = i - 1;
        
        while (j >= 0 && compare(arr[j], current) > 0) {
            arr[j + 1] = arr[j];
            j = j - 1;
        }
        arr[j + 1] = current;
    }
    return arr;
}

// 3. Quick Sort
function quickSort(arr, key, order) {
    const compare = getComparator(key, order);

    function partition(low, high) {
        let pivot = arr[high];
        let i = low - 1;

        for (let j = low; j < high; j++) {
            if (compare(arr[j], pivot) <= 0) {
                i++;
                [arr[i], arr[j]] = [arr[j], arr[i]]; 
            }
        }
        [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]]; 
        return i + 1;
    }

    function sort(low, high) {
        if (low < high) {
            let pi = partition(low, high);
            sort(low, pi - 1);
            sort(pi + 1, high);
        }
    }
    let tempArr = [...arr];
    sort(0, tempArr.length - 1);
    return tempArr;
}

// 4. Merge Sort Helper Function
function merge(left, right, key, order) {
    const compare = getComparator(key, order);
    let result = [];
    let leftIndex = 0;
    let rightIndex = 0;

    while (leftIndex < left.length && rightIndex < right.length) {
        if (compare(left[leftIndex], right[rightIndex]) <= 0) {
            result.push(left[leftIndex]);
            leftIndex++;
        } else {
            result.push(right[rightIndex]);
            rightIndex++;
        }
    }
    return result.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
}

// 4. Merge Sort
function mergeSort(arr, key, order) {
    if (arr.length <= 1) return arr;
    
    const mid = Math.floor(arr.length / 2);
    const left = arr.slice(0, mid);
    const right = arr.slice(mid);
    
    const sortedLeft = mergeSort(left, key, order);
    const sortedRight = mergeSort(right, key, order);
    
    return merge(sortedLeft, sortedRight, key, order);
}

// --- CORE APPLICATION LOGIC ---

// Main sorting function that selects the algorithm
function performSort(students, algo, sortBy, order) {
    let studentsCopy = students.map(s => ({ ...s })); 
    
    switch (algo) {
        case 'bubble':
            return bubbleSort(studentsCopy, sortBy, order);
        case 'insertion':
            return insertionSort(studentsCopy, sortBy, order);
        case 'quick':
            return quickSort(studentsCopy, sortBy, order);
        case 'merge':
            return mergeSort(studentsCopy, sortBy, order);
        default:
            return students;
    }
}

// Update the statistics section
async function updateStats() {
    try {
        const response = await fetch(`${apiUrl}/stats`);
        const stats = await response.json();
        
        document.getElementById('total-students').textContent = stats.total;
        document.getElementById('pass-students').textContent = stats.pass;
        document.getElementById('fail-students').textContent = stats.fail;
        document.getElementById('highest-marks').textContent = stats.highest;
        document.getElementById('lowest-marks').textContent = stats.lowest;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// --- CRUD Functions (New Logic) ---

// DELETE Function
async function deleteStudent(id) {
    if (confirm(`Do you want to delete student ID ${id}?`)) {
        try {
            const response = await fetch(`${apiUrl}/students/${id}`, {
                method: 'DELETE',
            });
            
            if (response.ok) {
                alert(`Student ID ${id} deleted successfully!`);
                updateStats();
                document.getElementById('sort-button').click(); // Refresh the list
            } else {
                const errorData = await response.json();
                alert(`Deletion Error: ${errorData.error}`);
            }
        } catch (error) {
            console.error('Delete API Error:', error);
            alert('Error connecting to the server.');
        }
    }
}

// UPDATE/EDIT Logic (using prompt for a quick solution)
function editStudentPrompt(student) {
    const newName = prompt(`Enter new name for student ID ${student.id}:`, student.name);
    if (newName === null || newName.trim() === "") return;

    const newMarksStr = prompt(`Enter new marks for student ID ${student.id}:`, student.marks);
    const newMarks = parseInt(newMarksStr);

    if (isNaN(newMarks) || newMarks < 0 || newMarks > 100) {
        alert("Invalid marks entered.");
        return;
    }
    
    // Send PUT request
    updateStudentApi(student.id, newName, newMarks);
}

async function updateStudentApi(id, name, marks) {
    try {
        const response = await fetch(`${apiUrl}/students/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name, marks })
        });

        if (response.ok) {
            alert(`Student ID ${id} updated successfully!`);
            updateStats();
            document.getElementById('sort-button').click(); // Refresh the list
        } else {
            const errorData = await response.json();
            alert(`Update Error: ${errorData.error}`);
        }
    } catch (error) {
        console.error('Update API Error:', error);
        alert('Error connecting to the server.');
    }
}

// Display students in the table (Updated to include Edit/Delete buttons)
function displayStudents(students) {
    studentListBody.innerHTML = '';
    if (students.length === 0) {
        studentListBody.innerHTML = '<tr><td colspan="4">No records found.</td></tr>'; // colspan 4
        return;
    }
    
    students.forEach((student, index) => {
        const row = studentListBody.insertRow();
        row.insertCell().textContent = index + 1; // Rank
        row.insertCell().textContent = student.name;
        row.insertCell().textContent = student.marks;
        
        // New cell for Action buttons
        const actionCell = row.insertCell();
        
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.className = 'action-btn edit-btn';
        // Pass the entire student object to the edit function
        editBtn.onclick = () => editStudentPrompt(student); 

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'action-btn delete-btn';
        // Pass the student ID to the delete function
        deleteBtn.onclick = () => deleteStudent(student.id); 
        
        actionCell.appendChild(editBtn);
        actionCell.appendChild(deleteBtn);
    });
}

// --- EVENT LISTENERS ---

// 1. For adding a student
document.getElementById('add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const marks = parseInt(document.getElementById('marks').value);
    
    try {
        const response = await fetch(`${apiUrl}/students`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name, marks })
        });
        
        if (response.ok) {
            alert('Student added successfully!');
            document.getElementById('add-form').reset();
            updateStats();
            document.getElementById('sort-button').click(); 
        } else {
            const errorData = await response.json();
            alert(`Error adding student: ${errorData.error}`);
        }
    } catch (error) {
        console.error('API Error:', error);
    }
});

// 2. For the Sort button
document.getElementById('sort-button').addEventListener('click', async () => {
    const algo = document.getElementById('sort-algo').value;
    const sortBy = document.getElementById('sort-by').value;
    const order = document.getElementById('sort-order').value;
    
    try {
        const response = await fetch(`${apiUrl}/students`);
        const students = await response.json();
        
        const sortedStudents = performSort(students, algo, sortBy, order);
        
        displayStudents(sortedStudents);
    } catch (error) {
        console.error('Error fetching or sorting data:', error);
        displayStudents([]);
    }
});

// 3. For the Download button
document.getElementById('download-button').addEventListener('click', () => {
    window.location.href = `${apiUrl}/download`;
});

// Load stats and display list on page load
document.addEventListener('DOMContentLoaded', () => {
    updateStats();
    document.getElementById('sort-button').click(); 
});