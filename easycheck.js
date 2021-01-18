/* EasyCheck JS 1.4.13
** Created by Elkin Lesmes, 2015-09-23
** Allows validate any field in a web form with multiple rules that can be easyly added in the class attribute of the fields.
** Works with multiple forms.
** Update (2020-01-31): 
        * Multiple message on same box
        * Fix regex text rule
        * New checked, password, and dateformat rules
        * DOM psedo-virtualization
        * Real time validation
        * Auto spaces remove function
** Update (2020-10-09): 
	 * New distinct validation rule     
** Last update (2021-01-15):
	 * New money formatter
     * Messages customizer
*/

var EasyCheck = function (container) {

    var my = {};
    var fields = [];
    var valid = true;
    var count = 0;
    my.container = container;

    var constructor = function () {
        // get all fields from container
        var domFields = $('#' + my.container).find('[class*=\'validate\']');
        // add fields to control list
        for (var i = 0; i < domFields.length; i++) {
            addField($(domFields[i]));
        }
    }

    var addField = function ($field) {
        // extract rules
        var sClass = $field.attr('class');
        var start = sClass.indexOf('{') + 1;
        var end = sClass.indexOf('}');
        var rules = sClass.substring(start, end).split(',');
        // add event listener for fields            
        $field.change(function () {
            validateEvent(this);
        });
        $field.keyup(function () {
            validateEvent(this);
        });
        // asigns id by default
        if ($field.attr('id') === undefined) {
            $field.attr('id', container + '_field' + (fields.length + count));
        }
        // construct field object
        var field = {
            id: $field.attr('id'),
            tagName: $field.prop('tagName').toLowerCase(),
            type: $field.prop('type'),
            value: undefined,
            rules: rules,
            valid: true,
            enabled: true,
            $object: $field,
            message: []
        }
        // add field to control list
        fields[field.id] = field;
        count++;
        // add remove space event
        for (var i = 0; i < field.rules.length; i++) {
            var rule = field.rules[i].trim();
            if (rule === "digit" || rule === "number" || rule === "email" || rule === "password" || rule === "dateformat") {
                $field.on('input', function () {
                    this.value = this.value.replace(/[ ]/g, '');
                });
                break;
            }
        }
    }

    my.validate = function () {
        valid = true;
        // validate all fields
        for (id in fields) { validateField(fields[id]); }
        // establishes focus on first error field
        for (id in fields) {
            if (!fields[id].valid) {
                $('html,body').animate({ scrollTop: fields[id].$object.offset().top }, 500, function () {
                    fields[id].$object.focus();
                });
                break;
            }
        }
        // return valid flag
        return valid;
    }

    my.validateField = function (id) {
        validateField(fields[id]);
    }

    my.updateValue = function (id, value) {
        fields[id].$object.val(value);
    }

    my.addExtraField = function (id) {
        addField($("#" + id));
    }

    my.validationOff = function (id) {
        fields[id].enabled = false;
    }

    my.validationOn = function (id) {
        fields[id].enabled = true;
    }

    my.customMessages = function (id, collecion) {
        try {
            for (const prop in collecion)
            {
                fields[id].message[prop] = collecion[prop];
            }
        }
        catch { }
    }

    var validateEvent = function (domField) {
        validateField(fields[$(domField).attr('id')]);
    }

    var validateField = function (field) {
        try {
            field.valid = true; // restart field flag
            field.value = field.$object.val().trim(); // refresh field value
            // restart styles
            $("span[data-id='" + field.id + "_error']").remove();
            field.$object.removeClass("error");
            // apply rules
            for (var i = 0; i < field.rules.length; i++) {
                // apply simple rules
                switch (field.rules[i].trim()) {
                    case "required": required(field); break;
                    case "checked": checked(field); break;
                    case "digit": digit(field); break;
                    case "money": money(field); break;
                    case "number": number(field); break;
                    case "decimal": decimal(field); break;
                    case "text": text(field); break;
                    case "alphanumeric": alphanumeric(field); break;
                    case "email": email(field); break;
                    case "password": password(field); break;
                    default:
                        // extract function properties
                        var start = field.rules[i].indexOf('(') + 1;
                        var end = field.rules[i].indexOf(')');
                        var func = field.rules[i].substring(0, field.rules[i].indexOf('('));
                        var param = field.rules[i].substring(start, end).trim();
                        // apply function rules
                        switch (func.trim()) {
                            case "equals": equals(field, param); break;
                            case "distinct": distinct(field, param); break;
                            case "minlength": minlength(field, param); break;
                            case "maxlength": maxlength(field, param); break;
                            case "minvalue": minvalue(field, param); break;
                            case "maxvalue": maxvalue(field, param); break;
                            case "dateformat": dateformat(field, param); break;
                            default: ; break;
                        }
                        ; break;
                }
            }
        } catch (e) {
            valid = false;
            field.valid = valid;
            message(field, "*Error en reglas de validación del campo. ");
        }
    }

    var required = function (field) {
        if ((field.value.length == 0 || (field.tagName === "select" && field.value == 0)) && field.enabled) {
            valid = false;
            field.valid = valid;
            message(field, field.message["required"] || "Debe completar este campo. ");
        }
    }

    var checked = function (field) {
        if (!field.$object.prop("checked") && field.enabled) {
            valid = false;
            field.valid = valid;
            message(field, field.message["checked"] || "Debe marcar este campo. ");
        }
    }

    var digit = function (field) {
        if (field.value.length > 0 && field.enabled) {
            var regex = /^(\d+)$/;
            if (!regex.test(field.value)) {
                valid = false;
                field.valid = valid;
                message(field, field.message["digit"] || "Solo se admiten dígitos (0-9). ");
            }
        }
    }

    var money = function (field) {
        if (field.value.length > 0 && field.enabled) {
            
            var input_val = field.value.replace(/^0+/g, "");

            // check for decimal
            if (input_val.indexOf(".") >= 0) {

                // get position of first decimal this prevents multiple decimals from being entered
                var decimal_pos = input_val.indexOf(".");
                // split number by decimal point
                var left_side = input_val.substring(0, decimal_pos);
                var right_side = input_val.substring(decimal_pos);
                // add commas to left side of number
                left_side = left_side.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                // validate right side
                right_side = right_side.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                // Limit decimal to only 2 digits
                right_side = right_side.substring(0, 2);
                // join number by .
                input_val = left_side + "." + right_side;

            } else {
                input_val = input_val.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            }

            field.$object.val(input_val);
            field.valid = true;
        }
    }

    var number = function (field) {
        if (field.value.length > 0 && field.enabled) {
            var regex = /^(?:-?\d+|-?\d{1,3}(?:,\d{3})+)?(?:\.\d +)?$/;
            if (!regex.test(field.value)) {
                valid = false;
                field.valid = valid;
                message(field, field.message["number"] || "El valor debe ser númerico. ");
            }
        }
    }

    var decimal = function (field) {
        if (field.value.length > 0 && field.enabled) {
            var regex = /^(\d*\,)?\d+$/;
            if (!regex.test(field.value)) {
                valid = false;
                field.valid = valid;
                message(field, field.message["decimal"] || "Formato decimal incorrecto. ");
            }
        }
    }

    var text = function (field) {
        if (field.value.length > 0 && field.enabled) {
            var regex = /^([a-zA-ZÑñáéíóúÁÉÍÓÚ]+(?: [a-zA-ZñÑáéíóúÁÉÍÓÚ]+)*)$/;
            if (!regex.test(field.value)) {
                valid = false;
                field.valid = valid;
                message(field, field.message["text"] || "Contiene algúnos caracteres inválidos. ");
            }
        }
    }

    var alphanumeric = function (field) {
        if (field.value.length > 0 && field.enabled) {
            var regex = /^([a-zA-ZÑñáéíóúÁÉÍÓÚ0-9]+(?: [a-zA-ZñÑáéíóúÁÉÍÓÚ0-9]+)*)$/;
            if (!regex.test(field.value)) {
                valid = false;
                field.valid = valid;
                message(field, field.message["alphanumeric"] || "No se permiten caracteres especiales o espacios dobles. ");
            }
        }
    }

    var email = function (field) {
        if (field.value.length > 0 && field.enabled) {
            var regex = /^[_a-z0-9-]+(.[_a-z0-9-]+)*@[a-z0-9-]+(.[a-z0-9-]+)*[.]([a-z]{2,3})$/;
            if (!regex.test(field.value.toLowerCase().trim())) {
                valid = false;
                field.valid = valid;
                message(field, field.message["email"] || "No es un correo válido. ");
            }
        }
    }

    var password = function (field) {
        if (field.value.length > 0 && field.enabled) {
            var regex = /^(?=.*?[A-Z])(?=(.*[\d]){1,})(?=(.*[\W]){1,})(?!.*\s).{6,}$/;
            if (!regex.test(field.value.trim())) {
                valid = false;
                field.valid = valid;
                message(field, field.message["password"] || "Se requiere al menos 6 caracteres, una mayúscula, un número y un caracter especial.");
            }
        }
    }

    var equals = function (field, field2) {
        if (field.value != $("#" + field2).val() && field.enabled) {
            valid = false;
            field.valid = valid;
            message(field, field.message["equals"] || "El valor de confirmación no coincide. ");
        }
    }

    var distinct = function (field, field2) {
        if (field.value == $("#" + field2).val() && field.enabled) {
            valid = false;
            field.valid = valid;
            message(field, field.message["distinct"] || "Este valor ya existe, ingrese uno diferente. ");
        }
    }

    var minlength = function (field, size) {
        if (field.value.length > 0 && field.enabled && field.value.length < size) {
            valid = false;
            field.valid = valid;
            message(field, "Debe contener al menos " + size + " caracteres. ");
        }
    }

    var maxlength = function (field, size) {
        if (field.value.length > size && field.enabled) {
            valid = false;
            field.valid = valid;
            message(field, "No puede contener más de " + size + " caracteres. ");
        }
    }

    var minvalue = function (field, value) {

        if (field.value.length > 0 && field.enabled && parseInt(field.value) <= value) {

            valid = false;
            field.valid = valid;
            message(field, "El valor debe ser mayor a " + value);
        }
    }

    var maxvalue = function (field, value) {

        if (field.value.length > 0 && field.enabled && parseInt(field.value) >= value) {
            valid = false;
            field.valid = valid;
            message(field, "El valor debe ser inferior a " + value);
        }
    }

    var dateformat = function (field, format) {
        if (field.value.length > 0 && field.enabled) {
            var exp = format.toLowerCase();
            exp = exp.replace(/dd/g, '(\\#{2})');
            exp = exp.replace(/d/g, '(\\#{1,2})');
            exp = exp.replace(/mm/g, '(\\#{2})');
            exp = exp.replace(/m/g, '(\\#{1,2})');
            exp = exp.replace(/y{4}/g, '(\\#{4})');
            exp = exp.replace(/#/g, 'd');
            const regex = new RegExp('^' + exp + '$');
            if (!field.value.match(regex)) {
                field.valid = false;
            } else {
                format = format.toLowerCase();
                if (field.value.length == 10) {
                    format = format.replace(/dd/, '#').replace(/d/, 'dd').replace(/#/, 'dd');
                    format = format.replace(/mm/, '#').replace(/m/, 'mm').replace(/#/, 'mm');
                }
                if (field.value.length == 9) {
                    format = format.replace(/mm/, '#').replace(/m/, 'mm').replace(/#/, 'mm');
                }
                // day
                var a = format.match('d{1,2}').index;
                var b = format.match('d{1,2}')[0].length;
                var day = parseInt(field.value.substring(a, a + b));
                //month
                a = format.match('m{1,2}').index;
                b = format.match('m{1,2}')[0].length;
                var month = parseInt(field.value.substring(a, a + b));
                //year
                a = format.match('y{2,4}').index;
                b = format.match('y{2,4}')[0].length;
                var year = parseInt(field.value.substring(a, a + b));

                if (month == 4 || month == 6 || month == 9 || month == 11) {
                    if (day > 30) {
                        field.valid = false;
                    }
                } else {
                    if (month == 2) {
                        if ((year % 4 == 0 && day > 29) || (year % 4 != 0 && day > 28)) {
                            field.valid = false;
                        }
                    } else {
                        if (day > 31 || (month < 1 || month > 12)) {
                            field.valid = false;
                        }
                    }
                }
            }

            if (!field.valid) {
                valid = false;
                message(field, field.message["dateformat"] || "Formato de fecha incorrecto. ");
            }
        }
    }

    var message = function (field, text) {
        if ($("span[data-id='" + field.id + "_error']").length > 0) {
            $("span[data-id='" + field.id + "_error']").append('<span class="message">*' + text + '</span>');;
        } else {
            var top = (field.type === "checkbox") ? 22 : 0;
            field.$object.after('<span data-id="' + field.id + '_error" class="error" style="margin-top:' + top + 'px"><span class="message">*' + text + '</span></span>');
            field.$object.addClass('error');
        }
    }

    constructor(); // invoke constructor

    return my;
};
