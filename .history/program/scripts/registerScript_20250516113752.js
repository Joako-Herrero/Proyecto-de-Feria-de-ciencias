window.addEventListener("DOMContentLoaded", () => {
    const inputFecha = document.getElementById("inputDate");
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');

    inputFecha.value = `${yyyy}-${mm}-${dd}`;

    const fecha = document.getElementById("inputDate");
})

const formInput = document.getElementById('registroForm');
const mensajeElemento = document.getElementById('mensaje');


document.addEventListener('DOMContentLoaded', function () {
    // Obtener la fecha de hoy y ayer
    const hoy = new Date();
    console.log(hoy)
    const fechaHoy = hoy.toISOString().split('T')[0]; // YYYY-MM-DD
    console.log(fechaHoy)

    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1); // Ayer
    const fechaAyer = ayer.toISOString().split('T')[0]; // YYYY-MM-DD

    // Establecer los atributos 'max' y 'min' correctamente
    document.getElementById('toDate').setAttribute('max', fechaHoy); // Desde ayer
    document.getElementById('fromDate').setAttribute('max', fechaHoy); // Desde ayer hasta hoy

    // Forzar la fecha de hoy en el input 'toDate' (Hasta)
    document.getElementById('toDate').value = fechaHoy;

    // Si la fecha en 'fromDate' es menor que ayer, forzarla también a ayer
    if (document.getElementById('fromDate').value === "") {
        document.getElementById('fromDate').value = fechaAyer; // Establecer 'Desde' como ayer si está vacío
    }

    // Si quieres evitar que el input se quede con la fecha de ayer, puedes forzar la fecha a hoy si ya estaba en gris.
    setTimeout(() => {
        if (document.getElementById('toDate').value === fechaAyer) {
            document.getElementById('toDate').value = fechaHoy;
        }
    }, 10);
});

function cargarRegistros() {
    // Obtener los registros desde el backend
    fetch('http://localhost:8080/registro/list')
        .then(response => response.json())
        .then(data => {
            const tabla = document.querySelector('#tablaRegistros tbody');
            tabla.innerHTML = ''; // Limpiar tabla antes de agregar los nuevos registros

            // Iterar sobre los registros para agregarlos a la tabla
            data.forEach(registro => {
                const fila = document.createElement('tr');
                const montoDebe = registro.tipo === 'Sale' ? registro.monto : '';
                const montoHaber = registro.tipo === 'Entra' ? registro.monto : '';

                fila.innerHTML = `
                    <td>${registro.fecha}</td>
                    <td>${registro.nombre}</td>
                    <td>${montoDebe}</td>
                    <td>${montoHaber}</td>
                    <td>${registro.balance}</td>
                `;

                tabla.appendChild(fila);
            });
        })
        .catch(error => {
            console.error('Error al cargar registros:', error);
        });
}
document.getElementById("registroAddButtonForm").addEventListener("click", () =>{
    e.preventDefault();

    try {
        // Obtener los valores de las fechas seleccionadas
        const desdeFecha = document.querySelector('#fromDate').value;  // Fecha desde
        const hastaFecha = document.querySelector('#toDate').value;  // Fecha hasta

        // 1. Obtener todos los registros para saber el balance más reciente
        const response = await fetch('http://localhost:8080/registro/list');
        const registros = await response.json();

        // 2. Filtrar registros por las fechas seleccionadas (desde-hasta)
        const registrosFiltrados = registros.filter(registro => {
            const fechaRegistro = new Date(registro.fecha);
            return fechaRegistro >= new Date(desdeFecha) && fechaRegistro <= new Date(hastaFecha);
        });

        // 3. Calcular balance actual: si hay registros, tomar el último
        let balanceActual = 0;
        if (registrosFiltrados.length > 0) {
            const ultimoRegistro = registrosFiltrados[registrosFiltrados.length - 1];
            balanceActual = ultimoRegistro.balance;
        }

        // 4. Obtener datos del formulario
        const tipo = document.querySelector('#tipo').value;
        const monto = parseFloat(document.querySelector('#monto').value);

        // 5. Calcular nuevo balance
        let nuevoBalance = balanceActual;
        if (tipo === 'Entra') {
            nuevoBalance += monto;
        } else if (tipo === 'Sale') {
            nuevoBalance -= monto;
        }
        console.log(document.querySelector('#inputDate').value)
        // 6. Crear objeto para enviar
        const nuevoRegistro = {
            fecha: document.querySelector('#inputDate').value,
            nombre: document.querySelector('#Description').value,
            monto: monto,
            tipo: tipo,
            balance: nuevoBalance
        };

        // 7. Enviar a backend
        const res = await fetch('http://localhost:8080/registro/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoRegistro)
        });

        if (tipo === 'Entra') {
            const descripcion = document.querySelector('#Description').value.toLowerCase();
            if (descripcion.includes('venta')) {
                const partes = descripcion.split('venta');
                if (partes.length > 1) {
                    const nombreProducto = partes[1].trim();
                    console.log("antes fetch")
                    fetch('http://localhost:8080/productos/list')
                        .then(response => response.json())
                        .then(productos => {
                            const producto = productos.find(p => p.nombre.toLowerCase() === nombreProducto);
                            if (producto) {
                                const cantidadVendida = Math.floor(monto / producto.precioUnitario);
                                const nuevoStock = producto.stock - cantidadVendida;

                                // Crear el objeto dtoProduct con todos los campos (obligatorio para el PUT)
                                const dtoProduct = {
                                    nombre: producto.nombre,
                                    fecha: producto.fecha,
                                    descripcion: producto.descripcion,
                                    precioCosto: producto.precioCosto,
                                    stock: nuevoStock,
                                    precioUnitario: producto.precioUnitario,
                                    porcentajeGanancia: producto.porcentajeGanancia
                                };

                                // Llamar al endpoint /edit/{id}
                                fetch(`http://localhost:8080/productos/edit/${producto.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(dtoProduct)
                                })
                                    .then(res => {
                                        if (res.ok) {
                                            console.log(`Stock actualizado: ${producto.nombre} → ${nuevoStock} unidades`);
                                        } else {
                                            console.error('Error al actualizar el stock');
                                        }
                                    })
                                    .catch(err => {
                                        console.error('Error al hacer PUT /edit:', err);
                                    });
                            } else {
                                console.warn(`Producto no encontrado: ${nombreProducto}`);
                            }
                        })
                        .catch(error => {
                            console.error('Error al obtener productos:', error);
                        });
                }
            }
        }


        if (res.ok) {
            mensajeElemento.textContent = 'Registro creado correctamente';
            mensajeElemento.style.color = 'green';
            formInput.reset(); // ← esto borra todos los inputs del formulario
            // Restaurar la fecha de hoy en #inputDate después del reset
            const hoy = new Date().toISOString().split('T')[0];
            document.querySelector('#inputDate').value = hoy;

            cargarRegistros();
        } else {
            mensajeElemento.textContent = 'Hubo un error al crear el registro';
            mensajeElemento.style.color = 'red';

        }
    } catch (error) {
        console.error('Error al procesar el formulario:', error);
        mensajeElemento.textContent = 'No se pudo crear el registro';
        mensajeElemento.style.color = 'red';

    }
});

function cargarRegistros() {
    // Obtener los registros desde el backend
    fetch('http://localhost:8080/registro/list')
        .then(response => response.json())
        .then(data => {
            const tabla = document.querySelector('#tablaRegistros tbody');
            tabla.innerHTML = ''; // Limpiar tabla antes de agregar los nuevos registros

            // Iterar sobre los registros para agregarlos a la tabla
            data.forEach(registro => {
                const fila = document.createElement('tr');
                const montoDebe = registro.tipo === 'Sale' ? registro.monto : '';
                const montoHaber = registro.tipo === 'Entra' ? registro.monto : '';

                fila.innerHTML = `
                    <td>${registro.fecha}</td>
                    <td>${registro.nombre}</td>
                    <td>${montoHaber}</td>
                    <td>${montoDebe}</td>
                    <td>${registro.balance}</td>
                `;

                tabla.appendChild(fila);

            });
        })
        .catch(error => {
            console.error('Error al cargar registros:', error);
        });
}

// Llamar la función para cargar los registros cuando la página se cargue
window.addEventListener('DOMContentLoaded', cargarRegistros);



document.getElementById('formFiltrarFechasbutton').addEventListener('click', ()=> {
    e.preventDefault();

    const desde = document.getElementById('fromDate').value;
    const hasta = document.getElementById('toDate').value;

    fetch('http://localhost:8080/registro/list')
        .then(response => response.json())
        .then(data => {
            const tabla = document.querySelector('#tablaRegistros tbody');
            tabla.innerHTML = '';

            // Filtrar registros entre las fechas
            const registrosFiltrados = data.filter(registro => {
                return registro.fecha >= desde && registro.fecha <= hasta;

            });

            registrosFiltrados.forEach(registro => {
                const fila = document.createElement('tr');
                const montoDebe = registro.tipo === 'Sale' ? registro.monto : '';
                const montoHaber = registro.tipo === 'Entra' ? registro.monto : '';
                fila.innerHTML = `
                    <td>${registro.fecha}</td>
                    <td>${registro.nombre}</td>
                    <td>${montoHaber}</td>
                    <td>${montoDebe}</td>
                    <td>${registro.balance}</td>
                `;

                tabla.appendChild(fila);
            });
        })
        .catch(error => {
            console.error('Error al cargar registros:', error);
        });
});

