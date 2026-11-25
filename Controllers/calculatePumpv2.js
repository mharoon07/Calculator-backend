const calculatePumpv2 = (req, res) => {
    try {
      const {
        h_suction_ft,
        h_discharge_ft,
        bathrooms,
        kitchens,
        washing_machines,
        flow_manual_lpm,
        pl_ft,
        dia_in,
        material,
        elbows,
        valves,
        tees,
        ends,
        desired_unit,
        desired_val,
        pump_efficiency,
        motor_efficiency,
        safety_factor,
        tempC,
      } = req.body;
  
      // Constants
      const EPS = { "uPVC/cPVC": 0.0015e-3, PPR: 0.007e-3, GI: 0.150e-3 };
      const K_ELBOW_90 = 0.9, K_VALVE_THRU = 0.2, K_TEE_THRU = 0.6, K_ENTRY = 0.5, K_EXIT = 1.0;
      const g = 9.80665;
  
      // Enhanced Validation
      const requiredFields = [
        'h_suction_ft', 'h_discharge_ft', 'bathrooms', 'kitchens', 'washing_machines',
        'pl_ft', 'dia_in', 'desired_val', 'pump_efficiency', 'motor_efficiency', 'tempC'
      ];
      const problems = [];
      for (const field of requiredFields) {
        const val = parseFloat(req.body[field]);
        if (isNaN(val)) {
          problems.push(`Missing or invalid: ${field}`);
        } else if (val < 0 && !['h_suction_ft'].includes(field)) {  // Allow negative suction
          problems.push(`Negative value for ${field}`);
        }
      }
      if (problems.length > 0) {
        throw new Error(problems.join('; '));
      }
  
      if (!['uPVC/cPVC', 'PPR', 'GI'].includes(material)) {
        throw new Error('Invalid pipe material.');
      }
      if (!['yes', 'no'].includes(ends)) {
        throw new Error('Invalid selection for entry/exit losses.');
      }
      if (!['bar', 'psi'].includes(desired_unit)) {
        throw new Error('Invalid pressure unit.');
      }
      if (!['1.15', '1.25', '1.30', '1.50'].includes(safety_factor)) {
        throw new Error('Invalid safety factor.');
      }
  
      // Parse inputs (with defaults)
      const h_suction_m = parseFloat(h_suction_ft) * 0.3048;
      const h_discharge_m = parseFloat(h_discharge_ft) * 0.3048;
      const L_m = parseFloat(pl_ft) * 0.3048;
      const D_m = parseFloat(dia_in) * 0.0254;
      const epsilon = EPS[material] || EPS['uPVC/cPVC'];
      const elbows_count = Math.max(0, parseFloat(elbows) || 0);
      const valves_count = Math.max(0, parseFloat(valves) || 0);
      const tees_count = Math.max(0, parseFloat(tees) || 0);
      const add_ends = ends === 'yes';
      const desired_val_num = parseFloat(desired_val);
      const pe = Math.max(0.01, Math.min(0.95, parseFloat(pump_efficiency) / 100));
      const me = Math.max(0.01, Math.min(0.98, parseFloat(motor_efficiency) / 100));
      const SF = parseFloat(safety_factor);
      const tempC_num = Math.max(0, parseFloat(tempC) || 20);  // Clamp >=0
  
      if (L_m < 0) throw new Error('Pipe length cannot be negative.');
      if (D_m <= 0) throw new Error('Pipe diameter must be >0.');
  
      // Estimate flow
      const bathrooms_num = Math.max(0, parseFloat(bathrooms) || 0);
      const kitchens_num = Math.max(0, parseFloat(kitchens) || 0);
      const washing_machines_num = Math.max(0, parseFloat(washing_machines) || 0);
      const est_flow_lpm = bathrooms_num * 9 + kitchens_num * 6 + washing_machines_num * 10;
      let Q_lpm;
      if (flow_manual_lpm && flow_manual_lpm.trim() !== '' && !isNaN(parseFloat(flow_manual_lpm))) {
        Q_lpm = Math.max(0, parseFloat(flow_manual_lpm));
      } else {
        Q_lpm = est_flow_lpm;
      }
      if (Q_lpm <= 0) {
        throw new Error('Design flow must be >0 L/min.');
      }
      if (desired_val_num < 0) {
        throw new Error('Desired pressure cannot be negative.');
      }
  
      // Hydraulics
      const Q_m3s = Q_lpm / 1000 / 60;
      const A = Math.PI * Math.pow(D_m / 2, 2);
      const v = Q_m3s / A;
  
      // Fixed water props (match HTML)
      const rho = 1000 - 0.3 * (tempC_num - 4);
      const nu = (() => {
        const tt = Math.max(0, Math.min(60, tempC_num));
        const nu10 = 1.307e-6, nu20 = 1.003e-6, nu40 = 0.658e-6;
        if (tt <= 20) {
          return nu10 + (nu20 - nu10) * ((tt - 10) / 10);
        } else {
          return nu20 + (nu40 - nu20) * ((tt - 20) / 20);
        }
      })();
      const Re = v * D_m / nu;
      const relRough = epsilon / D_m;
      const f = (() => {
        if (Re < 2000) return 64 / Math.max(Re, 1e-6);
        const log_term = (relRough / 3.7) + 5.74 / Math.pow(Re, 0.9);
        return 0.25 / Math.pow(Math.log10(log_term), 2);
      })();
  
      const h_f = f * (L_m / D_m) * (v * v / (2 * g));
      let K_total = elbows_count * K_ELBOW_90 + valves_count * K_VALVE_THRU + tees_count * K_TEE_THRU;
      if (add_ends) K_total += (K_ENTRY + K_EXIT);
      const h_m = K_total * (v * v / (2 * g));
  
      const h_desired = desired_unit === 'bar' ? desired_val_num * 10.1972 : desired_val_num * 0.70307;
  
      let H_req = h_discharge_m + h_f + h_m + h_desired - h_suction_m;
      if (H_req < 0) H_req = 0;
  
      const P_hyd_W = rho * g * Q_m3s * H_req;
      const P_in_W = P_hyd_W / (pe * me);
      const P_hp = P_in_W / 746;
      const P_hp_sf = P_hp * SF;
      const suggested_hp = (() => {
        const steps = [0.5, 0.75, 1, 1.5, 2, 2.5, 3];
        for (let step of steps) {
          if (P_hp_sf <= step) return step;
        }
        return Math.ceil(P_hp_sf * 2) / 2;
      })();
  
      const velocity_flag = (v < 0.6 || v > 2.0) ? 'check pipe size' : 'OK';
  
      res.status(200).json({
        success: true,
        results: {
          type: 'pump',
          
          // Hydraulics Section
          hydraulics: {
            design_flow_L_min: Math.round(Q_lpm),
            velocity_m_s: parseFloat(v.toFixed(3)),
            velocity_status: velocity_flag === 'OK' ? '[OK]' : '[CHECK]',
            reynolds_number: Math.round(Re),
            friction_factor_f: parseFloat(f.toFixed(4)),
            static_suction_head_m: parseFloat(h_suction_m.toFixed(2)),
            discharge_elevation_m: parseFloat(h_discharge_m.toFixed(2)),
            major_loss_friction_m: parseFloat(h_f.toFixed(2)),
            minor_loss_fittings_m: parseFloat(h_m.toFixed(2)),
            desired_pressure_head_m: parseFloat(h_desired.toFixed(2)),
            total_head_TDH_m: parseFloat(H_req.toFixed(2))
          },

          // Power Section
          power: {
            hydraulic_power_kW: parseFloat((P_hyd_W / 1000).toFixed(2)),
            motor_input_power_kW: parseFloat((P_in_W / 1000).toFixed(2)),
            motor_input_power_HP: parseFloat(P_hp.toFixed(2)),
            with_safety_factor_x: SF,
            final_power_HP: parseFloat(P_hp_sf.toFixed(2)),
            suggested_motor_size_HP: parseFloat(suggested_hp)
          }
        },
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };
  
  export { calculatePumpv2 };