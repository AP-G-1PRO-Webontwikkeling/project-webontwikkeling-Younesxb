function filterPlayers() {
    var input, filter, table, tr, td, i, txtValue;
    input = document.getElementById("searchInput");
    filter = input.value.toUpperCase();
    table = document.getElementById("playersTable");
    tr = table.getElementsByTagName("tr");
    for (i = 0; i < tr.length; i++) {
        td = tr[i].getElementsByTagName("td")[0]; 
        if (td) {
            txtValue = td.textContent || td.innerText;
            if (txtValue.toUpperCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }       
    }
}
function sortPlayers() {
    
    var table, rows, switching, i, x, y, shouldSwitch;
    table = document.getElementById("playersTable");
    switching = true;
    while (switching) {
        switching = false;
        rows = table.rows;
        for (i = 1; i < (rows.length - 1); i++) {
            shouldSwitch = false;
            x = rows[i].getElementsByTagName("td")[0];
            y = rows[i + 1].getElementsByTagName("td")[0];
         
            var sortAttribute = document.getElementById("sortAttribute").value;
            if (sortAttribute === 'age') {
                x = parseInt(x.innerHTML);
                y = parseInt(y.innerHTML);
            } else if (sortAttribute === 'overallRating') {
                x = parseInt(x.innerHTML);
                y = parseInt(y.innerHTML);
            } else {
                x = x.innerHTML.toLowerCase();
                y = y.innerHTML.toLowerCase();
            }
            if (x > y) {
                shouldSwitch = true;
                break;
            }
        }
        if (shouldSwitch) {
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
        }
    }
}



var sortAttribute = document.getElementById("sortAttribute").value;
var sortOrder = document.getElementById("sortOrder").value;

localStorage.setItem('sortAttribute', sortAttribute);
localStorage.setItem('sortOrder', sortOrder);


window.onload = function() {
    var sortAttribute = localStorage.getItem('sortAttribute');
    var sortOrder = localStorage.getItem('sortOrder');
    if (sortAttribute && sortOrder) {
        document.getElementById("sortAttribute").value = sortAttribute;
        document.getElementById("sortOrder").value = sortOrder;
    }
};
