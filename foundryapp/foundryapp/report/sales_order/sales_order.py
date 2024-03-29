# Copyright (c) 2013, yashwanth and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
import datetime


def execute(filters=None):
	columns = get_columns(filters)
	sor_data = []
	data = []
	week = ""
	day_of_week = {'Sunday': '1', 'Monday': '2', 'Tuesday': '3',
	 				'Wednesday': '4', 'Thursday': '5', 'Friday': '6', 'Saturday': '7'}
	foundry_settings = frappe.get_doc('FoundryApp Settings')

	for k in day_of_week.keys():
		if foundry_settings.weekly_planning_cycle_ends_on == k:
			# print("week :",k," value :",day_of_week[k])
			week = day_of_week[k]

	if filters.get("show_dispatch_items") == 1:
		data = fetch_dispatch_items_report(week)

	if filters.get("show_dispatch_items") is None:
		data = fetch_invoice_items_report(week)

	datum = generate_qty_plan(data, filters)
	sor_data = construct_report(datum, filters)
	return columns, sor_data


# fetches the report for dispatch items data by joining sales order, sales order item, BOM, BOM item, Item.
def fetch_dispatch_items_report(week):
	r_data = []

	r_data = frappe.db.sql("""select tso.name, tso.po_no, tso.foreign_buyer_name, tso.final_destination,
							tbi.item_code, tsi.pch_pallet_size, truncate((tsi.qty*tbi.qty)/tb.quantity, 0) as qty,
							date_sub(date(tsi.delivery_date), interval dayofweek(tsi.delivery_date)-%s day) delivery_date
							from `tabSales Order Item` as tsi
							join `tabSales Order` as tso on tso.name = tsi.parent
							join `tabBOM` as tb on tsi.item_code = tb.item
							join `tabBOM Item` as tbi on tb.name = tbi.parent
							join `tabItem` as ti on ti.item_code = tbi.item_code
							where ti.pch_made=1 and tb.is_default=1
							order by tso.po_no""",(week), as_dict=1)

	return r_data


# fetches the report for dispatch items data by joining sales order, sales order item, Item.
def fetch_invoice_items_report(week):
	r_data = []

	r_data = frappe.db.sql("""select tso.name, tso.po_no, tso.foreign_buyer_name, tso.final_destination,
							tsi.item_code, tsi.pch_pallet_size, tsi.qty, date_sub(date(tsi.delivery_date), interval dayofweek(tsi.delivery_date)-%s day) as delivery_date
							from `tabSales Order Item` as tsi
							join `tabSales Order` as tso on tso.name = tsi.parent
							join `tabItem` as ti on ti.item_code = tsi.item_code
							where ti.pch_made=1
							order by tso.po_no,tsi.item_code""",(week), as_dict = 1)

	return r_data


def generate_qty_plan(data, filters):
	if filters.get("show_dispatch_items") == 1:
		for d in data:
			query = frappe.db.sql("""select tcc.parent, tbi.item_code, truncate(tcc.so_qty*tbi.qty/tb.quantity,0) as so_qty,
									truncate(tcc.qty_to_be_filled*tbi.qty/tb.quantity, 0) as qty_to_be_filled
									from `tabContainer Child` as tcc
									join `tabContainer` as tc on tcc.parent = tc.name
									join `tabBOM` as tb on tcc.item =tb.item
									join `tabBOM Item` as tbi on tb.name = tbi.parent
									where (tc.foreign_buyer=%s and tc.final_destination=%s) and (tbi.item_code=%s and tcc.so_no=%s) and tb.is_default=1""",
									(d['foreign_buyer_name'], d['final_destination'], d['item_code'], d['name']), as_dict=1)
			# print(query)
			if len(query) > 0:
				for q in query:
					d['Quantity Planned in Containers'] = q['qty_to_be_filled']
					d['Quantity not Planned in Containers'] = q['so_qty'] - q['qty_to_be_filled']

			if len(query) == 0:
				d['Quantity Planned in Containers'] = 0
				d['Quantity not Planned in Containers'] = 0

	if filters.get("show_dispatch_items") is None:
		for d in data:
			query = frappe.db.sql("""select tcc.parent, tcc.so_no, tcc.item, tcc.so_qty, tcc.qty_to_be_filled
									from `tabContainer Child` as tcc
									join `tabContainer` as tc on tcc.parent = tc.name
									where (tc.foreign_buyer=%s and tc.final_destination=%s) and (tcc.item=%s and tcc.so_no=%s)""",
									(d['foreign_buyer_name'], d['final_destination'], d['item_code'], d['name']), as_dict=1)
			print(query)
			if len(query) > 0:
				for q in query:
					d['Quantity Planned in Containers'] = q['qty_to_be_filled']
					d['Quantity not Planned in Containers'] = q['so_qty'] - q['qty_to_be_filled']

			if len(query) == 0:
				d['Quantity Planned in Containers'] = 0
				d['Quantity not Planned in Containers'] = 0

	return data

def construct_report(data, filters):
	r_data = []

	if filters.get("foreign_buyer") and filters.get("final_destination"):
		for d in data:
			if ((d["foreign_buyer_name"] == filters.get("foreign_buyer")) and (d["final_destination"] == filters.get("final_destination"))):
				r_data.append([d['name'],d['po_no'],d['foreign_buyer_name'],
								d['final_destination'],d['item_code'],
								d['pch_pallet_size'],d['qty'],d['delivery_date'].strftime("%d-%m-%y"),
								d['Quantity Planned in Containers'],d['Quantity not Planned in Containers']])
	elif filters.get("foreign_buyer"):
		for d in data:
			if d["foreign_buyer_name"] == filters.get("foreign_buyer"):
				r_data.append([d['name'],d['po_no'],d['foreign_buyer_name'],
								d['final_destination'],d['item_code'],
								d['pch_pallet_size'],d['qty'],d['delivery_date'].strftime("%d-%m-%y"),
								d['Quantity Planned in Containers'],d['Quantity not Planned in Containers']])
	elif filters.get("final_destination"):
		for d in data:
			if d["final_destination"] == filters.get("final_destination"):
				r_data.append([d['name'],d['po_no'],d['foreign_buyer_name'],
								d['final_destination'],d['item_code'],
								d['pch_pallet_size'],d['qty'],d['delivery_date'].strftime("%d-%m-%y"),
								d['Quantity Planned in Containers'],d['Quantity not Planned in Containers']])
	else:
		for d in data:
			r_data.append([d['name'],d['po_no'],d['foreign_buyer_name'],
							d['final_destination'],d['item_code'],
							d['pch_pallet_size'],d['qty'],d['delivery_date'].strftime("%d-%m-%y"),
							d['Quantity Planned in Containers'],d['Quantity not Planned in Containers']])
	# print(r_data)
	return r_data

def get_columns(filters):
	"""return columns"""
	columns = []

	if filters.get("show_dispatch_items") == 1:
		columns = [
			("Sales Order")+"::150",
			("Customer PO Number")+"::100",
			("Foreign Buyer Name")+":150",
			("Port")+"::100",
			("Dispatch Item")+"::100",
		    ("Pallet Size")+"::80",
		    ("Quantity")+"::70",
			("Delivery Date")+"::100",
			("Quantity Planned in Containers")+"::120",
			("Quantity not Planned in Containers")+"::130",
			 ]
	if filters.get("show_dispatch_items") is None:
		columns = [
			("Sales Order")+"::150",
			("Customer PO Number")+"::100",
			("Foreign Buyer Name")+":150",
			("Port")+"::100",
			("Invoice Item")+"::100",
		    ("Pallet Size")+"::80",
		    ("Quantity")+"::70",
			("Delivery Date")+"::100",
			("Quantity Planned in Containers")+"::120",
			("Quantity not Planned in Containers")+"::130",
			 ]
	return columns