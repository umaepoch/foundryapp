// Copyright (c) 2021, yashwanth and contributors
// For license information, please see license.txt
frappe.ui.form.on("Container", "fetch_sales_order_data", function(frm, cdt, cdn) {
    var d = locals[cdt][cdn];
    var foreign_buyer = d.foreign_buyer;
    var final_destination = d.final_destination ? d.final_destination : null;
    var po_no = d.customer_po_no ? d.customer_po_no : null;
    console.log("customer_po_number: " + po_no)
    var warehouse = d.warehouse;
    var scheduled_date = d.scheduled_date;
    var add_multiple_po_no = d.add_multiple_po_no;
    if (warehouse == undefined || scheduled_date == undefined) {
        frappe.throw(__(`Please select Warehouse and Scheduled_date`))
    }

    if (foreign_buyer) {
      if (add_multiple_po_no === 1) {
        var details = fetch_so_details(foreign_buyer, final_destination, po_no)
        if (details) {

          details.forEach((item) => {
            var child = cur_frm.add_child("container_details")
            frappe.model.set_value(child.doctype, child.name, "so_no", item['name']);
            frappe.model.set_value(child.doctype, child.name, "item", item['item_code']);
            frappe.model.set_value(child.doctype, child.name, "item_name", item['item_name']);
            frappe.model.set_value(child.doctype, child.name, "pallet_size", item['pch_pallet_size']);
            frappe.model.set_value(child.doctype, child.name, "so_qty", item['qty']);
            frappe.model.set_value(child.doctype, child.name, "qty_left_in_so", item['qty_left_in_so']);
            if (warehouse) {
              frappe.model.set_value(child.doctype, child.name, "container_warehouse", warehouse);
            }
            if (scheduled_date) {
              frappe.model.set_value(child.doctype, child.name, "scheduled_date", scheduled_date);
            }
            frappe.model.set_value(child.doctype, child.name, "final_destination", final_destination);
            frappe.model.set_value(child.doctype, child.name, "customer_po_number", item['po_no']);
            frappe.model.set_value(child.doctype, child.name, "so_date",item['delivery_date']);
            frappe.model.set_value(child.doctype, child.name, "initial_delivery_date", item['transaction_date']);
            cur_frm.refresh_field("container_details");
          });

        }

      }

      if (add_multiple_po_no === 0) {
        cur_frm.clear_table("container_details");
        var details = fetch_so_details(foreign_buyer, final_destination, po_no)
        if (details) {

          details.forEach((item) => {
            var child = cur_frm.add_child("container_details")
            frappe.model.set_value(child.doctype, child.name, "so_no", item['name']);
            frappe.model.set_value(child.doctype, child.name, "item", item['item_code']);
            frappe.model.set_value(child.doctype, child.name, "item_name", item['item_name']);
            frappe.model.set_value(child.doctype, child.name, "pallet_size", item['pch_pallet_size']);
            frappe.model.set_value(child.doctype, child.name, "so_qty", item['qty']);
            frappe.model.set_value(child.doctype, child.name, "qty_left_in_so", item['qty_left_in_so']);
            if (warehouse) {
              frappe.model.set_value(child.doctype, child.name, "container_warehouse", warehouse);
            }
            if (scheduled_date) {
              frappe.model.set_value(child.doctype, child.name, "scheduled_date", scheduled_date);
            }
            frappe.model.set_value(child.doctype, child.name, "final_destination", final_destination);
            frappe.model.set_value(child.doctype, child.name, "customer_po_number", item['po_no']);
            frappe.model.set_value(child.doctype, child.name, "so_date",item['delivery_date']);
            frappe.model.set_value(child.doctype, child.name, "initial_delivery_date", item['transaction_date']);
            cur_frm.refresh_field("container_details");
          });

        }

      }

     } else {
       frappe.throw(__("Please select Foreign Buyer"))
     }
});

function fetch_so_details(foreign_buyer, final_destination, po_no) {

    console.log("entered into function");
    var selected_so = "";
    frappe.call({
        method: 'foundryapp.foundryapp.doctype.container.container.fetch_so_details',
        args: {
            "foreign_buyer": foreign_buyer,
            "final_destination": final_destination,
            "po_no": po_no
        },
        async: false,
        callback: function(r) {
          if (r.message) {
            if (r.message.Exception) {
              frappe.throw(__(r.message.Exception))
            } else {
              console.log(r)
              selected_so = r.message
            }
          }
        }
    });
    return selected_so;
}


frappe.ui.form.on("Container Child", "qty_to_be_filled", function(frm, cdt, cdn) {
    var child = locals[cdt][cdn]
    var qty_to_be_filled = child.qty_to_be_filled
    var qty_left_in_so = child.qty_left_in_so
    console.log(child)
    if (qty_to_be_filled > qty_left_in_so) {
        frappe.msgprint(`Quantity to be filled is greater than quantity left in sales order: ${qty_left_in_so}`)
    }

})


function check_for_existing(foreign_buyer, final_destination) {
    var print;
    frappe.call({
        method: 'foundryapp.foundryapp.doctype.container.container.validate_container_exist',
        args: {
            "foreign_buyer": foreign_buyer,
            "final_destination": final_destination
        },
        async: false,
        callback: function(r) {
            if (r.message) {
                // console.log(r.message[0]["name"])
                print = r.message
            }
        }
    })
    return print
}

frappe.ui.form.on("Container", "validate", function(frm, cdt, cdn) {
    $.each(frm.doc.container_details || [], function(i, d) {
        // console.log("enterd in for loop");
        if (d.so_qty % d.pallet_size != 0 || d.qty_to_be_filled % d.pallet_size != 0) {
            console.log("enterd in for loop", d.so_qty);
            frappe.msgprint("So Qty and Qty To Be Filled must be multiple of Pallet Size.Please correct Row" + '"' + d.idx + '"' + "  ")
            frappe.validated = false;
        }
    })
});


frappe.ui.form.on("Container", "after_save", function(frm, cdt, cdn) {
    var d = locals[cdt][cdn];
    var parent = d.name;
    var foreign_buyer = d.foreign_buyer;
    var final_destination = d.final_destination;
    var container_child = d.container_details;
    var scheduled_date = d.scheduled_date;
    var warehouse = d.warehouse;
    var item = "";
    var so_no = "";
    var sum_quantiy = 0

    if (container_child) {
      container_child.forEach((child) => {
        var qty_to_be_filled = child.qty_to_be_filled
        // console.log(child)
        var qty_left_in_so = child.qty_left_in_so
        if (scheduled_date) {
          child.scheduled_date = scheduled_date
        }
        if (warehouse) {
          child.container_warehouse = warehouse
        }
        item = child.item;
        so_no = child.so_no;
        var so_qty_bfr_cont = qty_left_in_so;
        var qty_not_placed_in_container = qty_left_in_so - qty_to_be_filled;
        var so_qty_aft_cont = qty_not_placed_in_container;
        var qty = sum_of_qty(parent, item);
        // // child.total_quantity_of_item_in_container = qty;
        // cur_frm.refresh()
        // cur_frm.refresh_field("container_details")
        // // frm.reload_doc()
        // frappe.db.set_value('Container Child', child.name, {
        //   so_quantity_not_placed_in_containers_before_this_container: so_qty_bfr_cont,
        //   so_quantity_not_placed_in_containers_after_this_container: so_qty_aft_cont,
        //   total_quantity_of_item_in_container: qty
        // }).then(r => {
        //   let doc = r.message;
        //   console.log(doc);
        // })

        var c_name = child.name
        set_child_value(parent, c_name, so_qty_bfr_cont, so_qty_aft_cont, qty, frm)

        let weight_of_item = fetch_item_weight(item)
        let total_qty = qty_to_be_filled * weight_of_item
        sum_quantiy += total_qty
      });
    }
    sum_quantiy = sum_quantiy / 1000
    create_dispatch_items(d.name,sum_quantiy, frm)
});

function set_child_value(doc, name, so_qty_bfr_cont, so_qty_aft_cont, qty, frm) {
  frappe.call({
    method : 'foundryapp.foundryapp.doctype.container.container.set_child_value',
    args : {
      'doc_name': doc,
      'name': name,
      'so_qty_bfr_cont': so_qty_bfr_cont,
      'so_qty_aft_cont': so_qty_aft_cont,
      'qty': qty
    },
    async: false,
    callback: function(r){
      if (r.message.Exception) {
        frappe.throw(__(r.message.Exception))
      } else {
        console.log(r)
        frm.reload_doc()
      }
    }
  })
}

function create_dispatch_items(name,tl_qty, frm) {
  frappe.call({
    method: 'foundryapp.foundryapp.doctype.container.container.create_container_dispatch_items',
    args : {
      'cont_name': name,
      'qty': tl_qty
    },
    async: false,
    callback: function(r) {
				if (r.message.Exception) {
					frappe.throw(__(r.message.Exception))
				} else {
					frm.reload_doc()
				}
      }
    });

}

//OPEN PO and CLOSED PO VALIDATION
frappe.ui.form.on("Container", "validate", function(frm, cdt, cdn) {
    var checked_so = {};
    var is_po_matching = true;
    var d = locals[cdt][cdn];
    console.log(d)
    var container_child = frm.doc.container_details;
    var open_po_count = 0;
    var closed_po_count = 0;
    for (var i = 0; i < container_child.length; i++) {
        var so_number = container_child[i]['so_no'];
        console.log("selected sales order number", so_number);
        var pch_po_type = fetch_pch_details(so_number);
        if (pch_po_type.pch_po_type == "Open PO") {
            open_po_count++;
            if (open_po_count >= 2) {
                is_po_matching = true;
            }
        }
        if (pch_po_type.pch_po_type == "Closed PO") {
            if (checked_so[so_number] !== "X") {
                checked_so[so_number] = "X";
                closed_po_count++;
            }
            if (closed_po_count > 1) {
                is_po_matching = false;
                break;
            }
        }

        if (i == 0) {
            var po_status = pch_po_type.pch_po_type;
        }
        console.log("pch_po_type ", pch_po_type);
        if (pch_po_type.pch_po_type !== po_status) {
            is_po_matching = false;
        }
    }
    if (is_po_matching) {
        //frappe.msgprint("You can save your container");
        frappe.validated = true;
    } else {
        frappe.msgprint("You cannot save container.Please check Po Type of sales order");
        frappe.validated = false;
    }
});

function fetch_pch_details(so_number) {
    console.log("entered into function");
    var fetched_details = "";
    frappe.call({
        method: 'frappe.client.get_value',
        args: {
            'doctype': 'Sales Order',
            'fieldname': 'pch_po_type',

            'filters': {
                'name': so_number,
            }
        },
        async: false,
        callback: function(r) {
            if (r.message) {
                fetched_details = r.message;
                console.log("readings-----------" + JSON.stringify(r.message));

            }
        }
    });
    return fetched_details;
}

function fetch_item_weight(item_code) {
    var weight;

    frappe.call({
        method: 'frappe.client.get_value',
        args: {
            'doctype': 'Item',
            'fieldname': 'weight_per_unit',

            'filters': {
                'item_code': item_code,
            }
        },
        async: false,
        callback: function(r) {
            if (r.message) {
                weight = r.message.weight_per_unit
            }
        }
    });
    return weight;
}



function sum_of_qty(parent, item) {
    var qty;
    frappe.call({
        method: 'foundryapp.foundryapp.doctype.container.container.qty_sum',
        args: {
            "parent": parent,
            "item": item
        },
        async: false,
        callback: function(r) {
            if (r.message) {
                // console.log(r.message[0]["name"])
                qty = r.message
            }
        }
    })
    return qty
}



function qty_in_container(foreign_buyer, final_destination, so_no, item) {
    var qty;
    frappe.call({
        method: 'foundryapp.foundryapp.doctype.container.container.container_details',
        args: {
            "foreign_buyer": foreign_buyer,
            "final_destination": final_destination,
            "so_no": so_no,
            "item": item,
        },
        async: false,
        callback: function(r) {
            if (r.message) {
                // console.log(r.message[0]["name"])
                qty = r.message
            }
        }
    })
    return qty
}

//Warehouse validation
frappe.ui.form.on("Container", "validate", function(frm, cdt, cdn) {
    var d = locals[cdt][cdn];
    var warehouse = d.warehouse;
    var flag = fetch_warehouse_container(warehouse)
    if (flag) {
      flag.forEach((check) => {
        if (d.__unsaved === 1 && d.name !== check.name) {
          frappe.throw(__("Warehouse already existed for another container"))
          frappe.validated = false;
        }
      });

    }
});


function fetch_warehouse_container(warehouse) {
    var warehouse;

    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            'doctype': 'Container',
            'fieldname': [
              'name',
              'warehouse'
            ],

            'filters': {
                'warehouse': warehouse,
            }
        },
        async: false,
        callback: function(r) {
            if (r.message) {
                console.log(r.message)
                warehouse = r.message;
            }
        }
    });
    return warehouse;
}
